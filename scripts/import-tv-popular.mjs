import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
console.clear();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const tmdbBearer = process.env.NEXT_PUBLIC_TMDB_BEARER_TOKEN;
const omdbApiKey = '5e9c0c32';

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Kredensial Supabase tidak ditemukan di .env.local");
  process.exit(1);
}

if (!tmdbBearer) {
  console.error("Error: NEXT_PUBLIC_TMDB_BEARER_TOKEN tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// SCRIPT IMPORT TMDB POPULAR TV SHOWS
// ==========================================

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const CONCURRENCY_LIMIT = 5;

async function fetchFromTmdb(endpoint) {
  const url = `${TMDB_BASE}${endpoint}`;
  const headers = { Authorization: `Bearer ${tmdbBearer}` };

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function getTvData(tmdbId) {
  const data = await fetchFromTmdb(`/tv/${tmdbId}`);
  if (!data) return null;

  const result = {
    tmdb_id: tmdbId.toString(),
    content_type: 'tv',
    category: 'series',
  };

  if (data.backdrop_path) result.backdrop_url = `${TMDB_IMG}/w1280${data.backdrop_path}`;
  if (data.poster_path) {
    const poster = `${TMDB_IMG}/w300_and_h450_face${data.poster_path}`;
    result.poster_url = poster;
    result.thumbnail_url = poster;
  }
  if (data.overview) result.description = data.overview;
  if (data.name) result.title = data.name; // TV shows use 'name' instead of 'title'
  if (data.genres?.length) result.genre = data.genres.map(g => g.name).join(', ');
  if (data.first_air_date) result.year = Number(data.first_air_date.split('-')[0]);
  
  if (data.episode_run_time && data.episode_run_time.length > 0) {
    const runtime = data.episode_run_time[0];
    result.duration = `${Math.floor(runtime / 60)}h ${runtime % 60}m`;
  }
  
  if (data.vote_average != null) result.score = Math.round(data.vote_average * 10) / 10;

  // Age Rating for TV
  try {
    const ratingData = await fetchFromTmdb(`/tv/${tmdbId}/content_ratings`);
    if (ratingData && ratingData.results) {
      const usRating = ratingData.results.find(r => r.iso_3166_1 === 'US');
      if (usRating && usRating.rating) {
        result.rating = usRating.rating;
      }
    }
  } catch (e) {}

  // External IDs for IMDB Score
  try {
    const extData = await fetchFromTmdb(`/tv/${tmdbId}/external_ids`);
    if (extData && extData.imdb_id) {
      const omdbRes = await fetch(`https://www.omdbapi.com/?apikey=${omdbApiKey}&i=${extData.imdb_id}`);
      if (omdbRes.ok) {
        const omdbData = await omdbRes.json();
        if (omdbData.Response !== "False") {
          if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
            result.imdb_score = parseFloat(omdbData.imdbRating);
            result.imdb_votes = omdbData.imdbVotes?.replace(/,/g, '') || '';
          }
          if (omdbData.Rated && omdbData.Rated !== 'N/A' && !result.rating) {
            result.rating = omdbData.Rated;
          }
        }
      }
    }
  } catch (e) {}

  return result;
}

async function processInBatches(items, batchSize, processor) {
  let results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.all(batchPromises);
    results = results.concat(batchResults);
    await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

async function run() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log("==========================================");
  console.log("📺 IMPORT TMDB POPULAR TV SHOWS");
  console.log("==========================================\n");

  const pageStr = await question('Berapa halaman POPULAR TV SHOWS yang ingin di-import? (1 halaman = 20 series, disarankan 1-5): ');
  const maxPages = parseInt(pageStr, 10);

  if (isNaN(maxPages) || maxPages < 1) {
    console.error('❌ Jumlah halaman tidak valid.');
    rl.close();
    process.exit(1);
  }

  let TV_IDS = [];
  console.log(`\n📥 Mengambil data dari ${maxPages} halaman TMDB Popular TV...`);
  
  try {
    for (let page = 1; page <= maxPages; page++) {
      process.stdout.write(`Membaca halaman ${page}... `);
      const data = await fetchFromTmdb(`/tv/popular?language=en-US&page=${page}`);
      if (data && data.results) {
        const ids = data.results.map(m => m.id);
        TV_IDS.push(...ids);
        console.log(`Dapat ${ids.length} series.`);
      } else {
        console.log(`Kosong atau gagal.`);
      }
    }
  } catch (err) {
    console.error(`\n❌ Gagal memproses daftar ID TMDB: ${err.message}`);
    rl.close();
    return;
  }

  if (TV_IDS.length === 0) {
    console.log(`\n❌ Tidak ditemukan series.`);
    rl.close();
    return;
  }

  // Hapus ID yang duplikat
  TV_IDS = [...new Set(TV_IDS)];

  console.log(`\n🚀 Memulai proses import ${TV_IDS.length} series secara PARALEL (Batch size: ${CONCURRENCY_LIMIT})...\n`);

  let successCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  await processInBatches(TV_IDS, CONCURRENCY_LIMIT, async (id) => {
    try {
      const { data: existing } = await supabase
        .from('videos')
        .select('id, title')
        .eq('tmdb_id', id.toString())
        .eq('content_type', 'tv') // Pastikan tipenya TV
        .maybeSingle();

      if (existing) {
        process.stdout.write('⏭️ ');
        duplicateCount++;
        return;
      }

      const tvData = await getTvData(id);
      if (!tvData) {
        process.stdout.write('❌');
        failedCount++;
        return;
      }

      const { error } = await supabase.from('videos').insert([tvData]);
      if (error) {
        process.stdout.write('⚠️');
        failedCount++;
        return;
      }

      process.stdout.write('✅');
      successCount++;
    } catch (err) {
      process.stdout.write('❌');
      failedCount++;
    }
  });

  console.log(`\n\n==========================================`);
  console.log(`📊 LAPORAN IMPORT TMDB POPULAR TV SHOWS`);
  console.log(`==========================================`);
  console.log(`Total ID Diproses: ${TV_IDS.length}`);
  console.log(`✅ Berhasil Masuk DB   : ${successCount}`);
  console.log(`⏭️  Sudah Ada (Duplikat) : ${duplicateCount}`);
  console.log(`🚫 Gagal / Error       : ${failedCount}`);
  console.log(`==========================================\n`);
  console.log(`Keterangan Ikon:`);
  console.log(`✅ Sukses | ⏭️ Duplikat | ❌/⚠️ Error`);
  
  rl.close();
}

run();

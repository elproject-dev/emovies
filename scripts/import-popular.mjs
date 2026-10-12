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
const omdbApiKey = '5e9c0c32'; // Sesuai di sistem sebelumnya

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
// SCRIPT IMPORT TMDB POPULAR MOVIES
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

async function getMovieData(tmdbId) {
  const data = await fetchFromTmdb(`/movie/${tmdbId}`);
  if (!data) return null;

  const result = {
    tmdb_id: tmdbId.toString(),
    content_type: 'movie',
    category: 'film',
  };

  if (data.backdrop_path) result.backdrop_url = `${TMDB_IMG}/w1280${data.backdrop_path}`;
  if (data.poster_path) {
    const poster = `${TMDB_IMG}/w300_and_h450_face${data.poster_path}`;
    result.poster_url = poster;
    result.thumbnail_url = poster;
  }
  if (data.overview) result.description = data.overview;
  if (data.title) result.title = data.title;
  if (data.genres?.length) result.genre = data.genres.map(g => g.name).join(', ');
  if (data.release_date) result.year = Number(data.release_date.split('-')[0]);
  if (data.runtime) result.duration = `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`;
  if (data.vote_average != null) result.score = Math.round(data.vote_average * 10) / 10;

  try {
    const ratingData = await fetchFromTmdb(`/movie/${tmdbId}/release_dates`);
    if (ratingData) {
      const usRelease = ratingData.results?.find(r => r.iso_3166_1 === 'US');
      const certification = usRelease?.release_dates?.find(r => r.certification)?.certification;
      if (certification) result.rating = certification;
    }
  } catch (e) {}

  try {
    const extData = await fetchFromTmdb(`/movie/${tmdbId}/external_ids`);
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
  console.log("🔥 IMPORT TMDB POPULAR MOVIES");
  console.log("==========================================\n");

  const pageStr = await question('Berapa halaman popular yang ingin di-import? (1 halaman = 20 film, disarankan 1-10): ');
  const maxPages = parseInt(pageStr, 10);

  if (isNaN(maxPages) || maxPages < 1) {
    console.error('❌ Jumlah halaman tidak valid.');
    rl.close();
    process.exit(1);
  }

  let MOVIE_IDS = [];
  console.log(`\n📥 Mengambil data dari ${maxPages} halaman TMDB Popular...`);
  
  try {
    for (let page = 1; page <= maxPages; page++) {
      process.stdout.write(`Membaca halaman ${page}... `);
      const data = await fetchFromTmdb(`/movie/popular?language=en-US&page=${page}`);
      if (data && data.results) {
        const ids = data.results.map(m => m.id);
        MOVIE_IDS.push(...ids);
        console.log(`Dapat ${ids.length} film.`);
      } else {
        console.log(`Kosong atau gagal.`);
      }
    }
  } catch (err) {
    console.error(`\n❌ Gagal memproses daftar ID TMDB: ${err.message}`);
    rl.close();
    return;
  }

  if (MOVIE_IDS.length === 0) {
    console.log(`\n❌ Tidak ditemukan film.`);
    rl.close();
    return;
  }

  // Hapus ID yang duplikat dalam hasil API sendiri (meskipun jarang terjadi)
  MOVIE_IDS = [...new Set(MOVIE_IDS)];

  console.log(`\n🚀 Memulai proses import ${MOVIE_IDS.length} movies secara PARALEL (Batch size: ${CONCURRENCY_LIMIT})...\n`);

  let successCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  await processInBatches(MOVIE_IDS, CONCURRENCY_LIMIT, async (id) => {
    try {
      const { data: existing } = await supabase
        .from('videos')
        .select('id, title')
        .eq('tmdb_id', id.toString())
        .maybeSingle();

      if (existing) {
        process.stdout.write('⏭️ ');
        duplicateCount++;
        return;
      }

      const movieData = await getMovieData(id);
      if (!movieData) {
        process.stdout.write('❌');
        failedCount++;
        return;
      }

      const { error } = await supabase.from('videos').insert([movieData]);
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
  console.log(`📊 LAPORAN IMPORT TMDB POPULAR`);
  console.log(`==========================================`);
  console.log(`Total ID Diproses: ${MOVIE_IDS.length}`);
  console.log(`✅ Berhasil Masuk DB   : ${successCount}`);
  console.log(`⏭️  Sudah Ada (Duplikat) : ${duplicateCount}`);
  console.log(`🚫 Gagal / Error       : ${failedCount}`);
  console.log(`==========================================\n`);
  console.log(`Keterangan Ikon:`);
  console.log(`✅ Sukses | ⏭️ Duplikat | ❌/⚠️ Error`);
  
  rl.close();
}

run();

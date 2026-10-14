'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Play, Info, Star, ChevronRight, PlayCircle, Film, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/loading-spinner';

const VideoCard = ({ video }: { video: any }) => {
  return (
    <Link href={`/movie/watch?id=${video.id}`} className="group flex flex-col gap-3 cursor-pointer w-full">

      {/* Image Frame with Neon Glow */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[#1f1f1f] border-3 border-green-500/60 shadow-[0_0_10px_rgba(34,197,94,0.3)] group-hover:border-green-400 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all duration-300">
        {video.poster_url || video.thumbnail_url ? (
          <img
            src={video.poster_url || video.thumbnail_url}
            alt={`Nonton ${video.title} (${video.year || '2024'}) Sub Indo`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-10 h-10 text-gray-600" />
          </div>
        )}

        {/* Rating Badge (StreamX Style) */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {(video.score || video.imdb_score) ? (
            <div className="bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-1.5 py-0.5 shadow-[0_0_5px_rgba(0,0,0,0.8)] flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> {Number(video.score || video.imdb_score).toFixed(1)}
            </div>
          ) : (
            <div className="bg-black/80 backdrop-blur-md border border-white/10 text-gray-400 text-[9px] font-bold px-1.5 py-0.5 shadow-[0_0_5px_rgba(0,0,0,0.8)]">NR</div>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <PlayCircle className="w-12 h-12 md:w-14 md:h-14 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" strokeWidth={1.2} />
        </div>
      </div>

      {/* Title & Meta Frame with Neon Glow */}
      <div className="flex flex-col p-2.5 bg-[#0f0f0f] border-3 border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.2)] group-hover:border-green-400 group-hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-300">
        <h3 className="font-semibold text-xs md:text-[13px] text-white line-clamp-1 group-hover:text-green-400 transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center justify-between text-[11px] md:text-xs text-gray-400 mt-1.5">
          <span>{video.year || "2024"}</span>
          <span className="border border-green-500/40 text-green-400 px-1.5 py-0.5 text-[10px] font-medium">
            {video.content_type === 'tv' || video.category === 'series' ? 'TV Show' : 'Movie'}
          </span>
        </div>
      </div>

    </Link>
  );
};

const HeroCarousel = ({ videos }: { videos: any[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Tambahkan klon hanya di AKHIR array untuk seamless looping ke depan: [0, 1, ..., N, clone(0)]
  // TIDAK ADA klon di awal (indeks 0 selalu film pertama asli) sehingga TIDAK AKAN PERNAH ada glitch render film lain saat awal load
  const extendedVideos = videos.length > 1 ? [...videos, videos[0]] : videos;

  // Reset index saat data videos berubah tanpa animasi
  useEffect(() => {
    setCurrentIndex(0);
    setIsTransitioning(false);
  }, [videos]);

  useEffect(() => {
    if (videos.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [videos, isPaused]);

  useEffect(() => {
    if (extendedVideos.length <= 1) return;

    // Saat mencapai slide klon paling akhir (yang merupakan klon dari film pertama)
    if (currentIndex === extendedVideos.length - 1) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0); // Lompat diam-diam kembali ke slide 0 asli
      }, 500); // 500ms sesuai durasi transisi
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, extendedVideos.length]);

  if (videos.length === 0) return null;

  const handlePrev = () => {
    if (currentIndex === 0) {
      setCurrentIndex(videos.length - 1);
      setIsTransitioning(false);
    } else {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="relative w-full aspect-square sm:aspect-auto sm:h-[70vh] md:h-[80vh] landscape:aspect-auto landscape:h-screen landscape:min-h-[420px] md:landscape:h-[85vh] md:landscape:min-h-[500px] group mb-8 md:mb-12 select-none animate-in fade-in duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full h-full relative overflow-hidden border-b-3 border-green-500/50 shadow-[0_10px_30px_rgba(34,197,94,0.2)]">
        <div
          className={`flex h-full ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {extendedVideos.map((video, idx) => (
            <div key={`${video.id}-${idx}`} className="min-w-full h-full relative">
              <img
                src={video.backdrop_url || video.thumbnail_url || video.poster_url}
                alt={video.title}
                className="w-full h-full object-cover"
                loading={idx === 0 ? "eager" : "lazy"}
              />
              {/* Gradient Overlays: Darken left for text readability, fade bottom into background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/90 via-[#0a0a0a]/50 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent"></div>

              {/* Content Aligned in Middle-Left (Portrait & Landscape) */}
              <div className="absolute inset-0 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center pt-14 sm:pt-20 md:pt-24 pb-8 sm:pb-14 md:pb-16 pointer-events-none">
                <div className="w-full md:w-3/5 lg:w-1/2 max-w-2xl pointer-events-auto">
                  {/* Meta Badges */}
                  {(video.year || video.score || video.imdb_score) && (
                    <div className="flex items-center gap-2 mb-1.5 sm:mb-2 md:mb-2.5">
                      {video.year && (
                        <span className="text-gray-300 text-xs font-semibold bg-black/50 px-2 py-0.5 border border-white/10">
                          {video.year}
                        </span>
                      )}

                      {(video.score || video.imdb_score) && (
                        <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-black/60 px-2 py-0.5 border border-yellow-500/30">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {Number(video.score || video.imdb_score).toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}

                  <h2 className="text-xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-1.5 sm:mb-2 md:mb-4 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)] line-clamp-2">
                    {video.title}
                  </h2>
                  <p className="text-gray-300 text-xs sm:text-sm md:text-base line-clamp-2 md:line-clamp-3 mb-2.5 sm:mb-3 md:mb-6 max-w-2xl">
                    {video.description || "No description available for this movie."}
                  </p>
                  <div className="flex items-center gap-2 md:gap-3">
                    <Link href={`/movie/watch?id=${video.id}&play=true`} className="bg-green-500 hover:bg-green-400 text-white font-bold text-xs sm:text-sm md:text-base py-1.5 px-3 sm:py-2 sm:px-4 md:py-3 md:px-8 flex items-center gap-1.5 md:gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)]">
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 fill-white" /> Play Now
                    </Link>
                    <Link href={`/movie/watch?id=${video.id}`} className="bg-[#222]/80 hover:bg-[#333] backdrop-blur-md border border-gray-600 text-white font-medium text-xs sm:text-sm md:text-base py-1.5 px-3 sm:py-2 sm:px-4 md:py-3 md:px-8 flex items-center gap-1.5 md:gap-2 transition-colors">
                      <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> More Info
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots & Next Button */}
      <div className="absolute bottom-2 mb-2 sm:bottom-6 landscape:bottom-2 left-0 right-0 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between sm:justify-start gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 max-w-[calc(100%-90px)] sm:max-w-xl overflow-x-auto no-scrollbar py-1">
          {videos.map((_, idx) => {
            const isActive = currentIndex === idx || (currentIndex === extendedVideos.length - 1 && idx === 0);
            return (
              <button
                key={idx}
                onClick={() => {
                  setIsTransitioning(true);
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 sm:h-2 rounded-full transition-all shrink-0 ${isActive ? 'bg-green-500 w-6 sm:w-8 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-gray-500/50 w-1.5 sm:w-2 hover:bg-gray-400'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>

        {videos.length > 1 && (
          <button
            onClick={handleNext}
            className="w-5 h-5 sm:w-5 sm:h-5 lg:w-7 lg:h-7 rounded-full bg-black/60 hover:bg-green-500 text-gray-300 hover:text-black border border-white/20 hover:border-green-400 flex items-center justify-center transition-all backdrop-blur-md shadow-md sm:ml-1 cursor-pointer"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const VideoRow = ({ title, videos, viewAllLink }: { title: string, videos: any[], viewAllLink?: string }) => {
  const displayVideos = videos.slice(0, 12);

  return (
    <div className="mb-10 w-full px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm md:text-xl font-bold text-white flex items-center gap-2">
          {title} <ChevronRight className="w-5 h-5 text-gray-500" />
        </h2>
        {viewAllLink && (
          <Link href={viewAllLink} className="text-sm font-medium text-gray-400 hover:text-white">
            View all
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5">
        {displayVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
};

const FilteredVideoGrid = ({ title, videos }: { title: string, videos: any[] }) => {
  const [visibleCount, setVisibleCount] = useState(12);
  const displayVideos = videos.slice(0, visibleCount);

  useEffect(() => {
    const handleScroll = () => {
      // Check if we are near the bottom of the page
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600) {
        setVisibleCount((prev) => Math.min(prev + 12, videos.length));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [videos.length]);

  return (
    <div className="mb-10 w-full px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-4 mt-4">
        <h2 className="text-sm md:text-2xl font-bold text-white flex items-center gap-3">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5">
        {displayVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {visibleCount < videos.length && (
        <div className="flex justify-center mt-12 mb-8">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const selectHeroVideos = (videoList: any[], shouldShuffle = false, limit = 10) => {
  if (!videoList || videoList.length === 0) return [];
  const uniqueVideos = Array.from(new Map(videoList.map(v => [v.id, v])).values());
  const featuredPool = uniqueVideos.filter((v: any) => v.is_featured === true);

  let pool: any[] = [];
  if (featuredPool.length > 0) {
    // Ambil dari seluruh film unggulan terpilih di wadah
    pool = [...featuredPool];
  } else {
    // Fallback jika belum ada film unggulan di wadah
    const backdropVideos = uniqueVideos.filter((v: any) => v.backdrop_url);
    pool = backdropVideos.length > 0 ? backdropVideos : uniqueVideos;
  }

  // Opsi random: acak urutan film dari wadah sebelum mengambil 10 film
  const ordered = shouldShuffle ? shuffleArray(pool) : pool;

  // Batasi hanya 10 film per halaman
  return ordered.slice(0, limit);
};

export default function Home({ initialVideos = [] }: { initialVideos?: any[] }) {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  const typeFilter = searchParams?.get('type') || '';
  const genreFilter = searchParams?.get('genre') || '';
  const viewFilter = searchParams?.get('view') || '';

  const [videos, setVideos] = useState<any[]>(initialVideos);
  const [heroVideos, setHeroVideos] = useState<any[]>([]);
  const [isHeroMounted, setIsHeroMounted] = useState(false);
  const heroInitialized = useRef(false);
  const [isLoading, setIsLoading] = useState(initialVideos.length === 0);

  // Inisialisasi 10 film hero banner acak dari wadah satu kali per pemuatan halaman (mencegah flashback)
  useEffect(() => {
    if (!heroInitialized.current) {
      const source = videos.length > 0 ? videos : initialVideos;
      setHeroVideos(selectHeroVideos(source, true, 10));
      heroInitialized.current = true;
      setIsHeroMounted(true);
    }
  }, []);

  useEffect(() => {
    const isFiltered = Boolean(query || typeFilter || genreFilter || viewFilter);

    const fetchVideos = async () => {
      if (initialVideos.length === 0 || isFiltered) {
        setIsLoading(true);
      }
      try {
        let request = supabase.from('videos').select('*');

        if (query) {
          request = request.ilike('title', `%${query}%`).order('created_at', { ascending: false }).limit(100);
        } else if (genreFilter) {
          request = request.ilike('genre', `%${genreFilter}%`).order('created_at', { ascending: false }).limit(200);
        } else if (typeFilter) {
          if (typeFilter === 'movie') {
            request = request.in('content_type', ['movie', 'film']).order('created_at', { ascending: false }).limit(200);
          } else {
            request = request.eq('content_type', typeFilter).order('created_at', { ascending: false }).limit(200);
          }
        } else if (viewFilter === 'featured') {
          request = request.eq('is_featured', true).order('created_at', { ascending: false }).limit(200);
        } else if (viewFilter === 'popular' || viewFilter === 'trending') {
          request = request.order('view_count', { ascending: false, nullsFirst: false }).limit(200);
        } else if (viewFilter === 'latest') {
          request = request.order('created_at', { ascending: false }).limit(200);
        } else {
          // Default homepage: fetch movie, TV, dan seluruh unggulan wadah terpisah agar seimbang
          const [moviesRes, tvRes, featuredRes] = await Promise.all([
            supabase.from('videos').select('*').in('content_type', ['movie', 'film']).order('created_at', { ascending: false }).limit(150),
            supabase.from('videos').select('*').eq('content_type', 'tv').order('created_at', { ascending: false }).limit(50),
            supabase.from('videos').select('*').eq('is_featured', true).order('created_at', { ascending: false }).limit(100),
          ]);

          if (moviesRes.error) throw moviesRes.error;

          const mergedIds = new Set<string>();
          const merged: any[] = [];

          // Gabungkan movie + TV + seluruh featured wadah tanpa duplikat
          for (const list of [moviesRes.data, tvRes.data, featuredRes.data]) {
            for (const v of (list || [])) {
              if (!mergedIds.has(v.id)) {
                mergedIds.add(v.id);
                merged.push(v);
              }
            }
          }

          setVideos(merged);
          // Hanya inisialisasi jika belum terpasang, jangan menimpa hero banner yang sedang aktif agar TIDAK TERJADI FLASHBACK
          if (!heroInitialized.current) {
            setHeroVideos(selectHeroVideos(merged, true, 10));
            heroInitialized.current = true;
            setIsHeroMounted(true);
          }
          setIsLoading(false);
          return;
        }

        const { data, error } = await request;
        if (error) throw error;
        const list = data || [];
        setVideos(list);
      } catch (err) {
        console.error('Error fetching videos:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, [query, typeFilter, genreFilter, viewFilter]);

  // --- Deduplication bertahap: video yang sudah tampil di satu row tidak muncul di row lain ---

  // Row 1: Awesome Movies (Featured) — prioritas tertinggi
  const manualFeaturedVideos = videos.filter(v => v.is_featured === true);
  const usedIds = new Set<string>(manualFeaturedVideos.map(v => v.id));

  // Row 2: Trending Now — khusus movie, urutkan berdasarkan view_count
  const trendingPool = [...videos]
    .filter(v => !usedIds.has(v.id) && v.content_type !== 'tv')
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 15);
  const popularVideos = trendingPool;
  trendingPool.forEach(v => usedIds.add(v.id));

  // Row 3: Popular Movies — khusus movie, top view_count
  const mostPopularVideos = [...videos]
    .filter(v => !usedIds.has(v.id) && v.content_type !== 'tv')
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 15);
  mostPopularVideos.forEach(v => usedIds.add(v.id));

  // Row 4: TV Show Recommendations — khusus content_type 'tv', kecualikan sudah dipakai
  const tvShowVideos = videos
    .filter(v => !usedIds.has(v.id) && (v.content_type === 'tv' || v.category === 'series'))
    .slice(0, 15);
  tvShowVideos.forEach(v => usedIds.add(v.id));

  // Row 5: Latest Movies — terbaru (urutan dari DB), kecualikan sudah dipakai
  const newlyAddedVideos = videos
    .filter(v => !usedIds.has(v.id))
    .slice(0, 15);

  const isFilteredView = !!(query || typeFilter || genreFilter || viewFilter);
  const searchResults = isFilteredView ? videos : [];

  let sectionTitle = "Movies";
  if (query) sectionTitle = `Search Results for "${query}"`;
  else if (genreFilter) sectionTitle = `${genreFilter} Movies`;
  else if (typeFilter === 'movie') sectionTitle = `All Movies`;
  else if (typeFilter === 'tv') sectionTitle = `All TV Shows`;
  else if (viewFilter === 'featured') sectionTitle = 'Awesome Movies';
  else if (viewFilter === 'trending') sectionTitle = 'Trending Now';
  else if (viewFilter === 'popular') sectionTitle = 'Popular Movies';
  else if (viewFilter === 'latest') sectionTitle = 'Latest Movies';

  return (
    <div className="w-full text-white bg-[#0a0a0a] min-h-screen pb-20">
      <h1 className="sr-only">EMOVIES - Nonton Film & TV Series Streaming Sub Indo Gratis</h1>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      ) : videos.length > 0 ? (
        <>
          {isFilteredView ? (
            <div className="pt-24 pb-20">
              {searchResults.length > 0 ? (
                <FilteredVideoGrid title={sectionTitle} videos={searchResults} />
              ) : (
                <div className="flex flex-col items-center justify-center py-32">
                  <Search className="w-16 h-16 text-gray-700 mb-4" />
                  <p className="text-gray-400 text-lg">No results found.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {isHeroMounted ? (
                <HeroCarousel videos={heroVideos} />
              ) : (
                <div className="relative w-full h-[55vh] md:h-[80vh] bg-[#111] mb-12 border-b-3 border-green-500/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
                  <div className="absolute inset-0 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 md:pb-20">
                    <div className="w-24 h-5 bg-white/5 mb-3" />
                    <div className="w-2/3 max-w-lg h-10 bg-white/5 mb-4" />
                    <div className="w-1/2 max-w-md h-4 bg-white/5 mb-6" />
                    <div className="flex gap-3">
                      <div className="w-28 h-9 bg-green-500/20" />
                      <div className="w-28 h-9 bg-white/5" />
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-4">
                {manualFeaturedVideos.length > 0 && (
                  <VideoRow title="Awesome Movies" videos={manualFeaturedVideos} viewAllLink="/?view=featured" />
                )}
                <VideoRow title="Trending Now" videos={popularVideos} viewAllLink="/?view=trending" />
                <VideoRow title="Popular Movies" videos={mostPopularVideos} viewAllLink="/?view=popular" />
                {tvShowVideos.length > 0 && (
                  <VideoRow title="TV Show" videos={tvShowVideos} viewAllLink="/?type=tv" />
                )}
                <VideoRow title="Latest Movies" videos={newlyAddedVideos} viewAllLink="/?view=latest" />
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 pt-40">
          {!isLoading && <p className="text-gray-500">No movies found.</p>}
        </div>
      )}

      {/* High-Authority Professional SEO Section (Visually hidden for clean UI, fully parsed by Search Engines & Screen Readers) */}
      <section className="sr-only" aria-label="Informasi Lengkap, Direktori Genre, dan Panduan Streaming EMOVIES">
        <header>
          <h2>EMOVIES - Platform Nonton Film Bioskop & TV Series Streaming Sub Indo Gratis</h2>
          <p>
            Selamat datang di EMOVIES, portal hiburan sinematik digital terlengkap di Indonesia yang menyajikan ribuan koleksi film bioskop box office terbaru dan serial televisi internasional dengan subtitle bahasa Indonesia (Sub Indo) secara gratis. Nikmati tayangan berkualitas jernih mulai dari 720p HD, 1080p Full HD hingga 4K Ultra HD yang didukung oleh infrastruktur multi-server cepat, stabil, dan minim buffering.
          </p>
        </header>

        <article>
          <h3>1. Pusat Nonton Film Online & Bioskop Streaming Terlengkap 2026</h3>
          <p>
            EMOVIES menjadi destinasi utama bagi para penikmat film yang menginginkan akses streaming film sub indo secara cepat, praktis, dan tanpa repot. Kami mengkurasi katalog film global dari berbagai industri perfilman terkemuka di dunia:
          </p>
          <ul>
            <li>Film Blockbuster Hollywood: Rilis box office terpopuler dari studio Universal, Warner Bros, Paramount, 20th Century Studios, dan Sony Pictures.</li>
            <li>Sinema Asia & Lokal: Pilihan film Indonesia terbaru, film laga Mandarin, thriller Korea peraih penghargaan, dan karya sinematik Jepang.</li>
            <li>Sinema Festival & Independen: Mahakarya film peraih piala Oscar, festival film Cannes, Sundance, dan festival film bergengsi dunia lainnya.</li>
          </ul>
          <p>
            Seluruh film dapat ditonton langsung dari browser tanpa perlu menginstal aplikasi tambahan yang memberatkan perangkat atau mengeluarkan biaya langganan bulanan.
          </p>
        </article>

        <article>
          <h3>2. Direktori Kategori & 18 Genre Sinematik Terfavorit</h3>
          <p>
            EMOVIES memudahkan penonton menjelajahi katalog berdasarkan kategori dan genre favorit:
          </p>
          <ul>
            <li><strong>Action (Aksi Laga):</strong> Suguhan pertempuran mendebarkan, kejar-kejaran mobil, baku tembak spektakuler, film pahlawan super Marvel dan DC, serta aksi bela diri bela negara yang memacu adrenalin.</li>
            <li><strong>Adventure (Petualangan):</strong> Ekspedisi mencari misteri masa lampau, petualangan di rimba liar, perburuan harta karun legendaris, dan eksplorasi dimensi baru.</li>
            <li><strong>Animation (Animasi):</strong> Film kartun ramah anak, animasi 3D memukau buatan studio papan atas seperti Disney, Pixar, DreamWorks, hingga anime movie bioskop Jepang.</li>
            <li><strong>Comedy (Komedi):</strong> Lawakan segar pengocok perut, komedi situasi cerdas, parodi menggelitik, dan film romcom penghilang stres setelah seharian beraktivitas.</li>
            <li><strong>Crime (Kriminalitas):</strong> Penyelidikan kasus detektif jenius, aksi perampokan penuh siasat, dunia gelap sindikat mafia, dan intrik konspirasi penegak hukum.</li>
            <li><strong>Documentary (Dokumenter):</strong> Eksplorasi sains mendalam, sejarah peradaban manusia, riwayat hidup tokoh dunia, serta keajaiban alam dan satwa liar.</li>
            <li><strong>Drama:</strong> Perjalanan hidup penuh haru, perjuangan meraih mimpi, konflik keluarga yang emosional, dan dinamika sosial masyarakat yang menyentuh hati.</li>
            <li><strong>Family (Keluarga):</strong> Tontonan edukatif dan inspiratif yang aman dan menghangatkan suasana saat berkumpul bersama seluruh anggota keluarga.</li>
            <li><strong>Fantasy (Fantasi):</strong> Petualangan sihir legendaris, mitologi kuno, makhluk mistis seperti naga dan peri, serta kerajaan magis penuh pesona imajinasi.</li>
            <li><strong>History (Sejarah):</strong> Penggambaran akurat peristiwa penting masa lalu, perang bersejarah, dan biografi tokoh pahlawan revolusioner dunia.</li>
            <li><strong>Horror (Horor):</strong> Suasana gelap mencekam, rumah berhantu, jumpscare mengejutkan, teror hantu lokal dan supranatural internasional yang menguji nyali.</li>
            <li><strong>Music (Musik):</strong> Pagelaran konser musik spektakuler, kisah inspiratif musisi dunia, dan film drama musikal dengan lagu-lagu legendaris.</li>
            <li><strong>Mystery (Misteri):</strong> Teka-teki pembunuhan ganjil, pengungkapan rahasia kelam, dan rangkaian petunjuk dengan akhir cerita yang tak terduga (plot twist).</li>
            <li><strong>Romance (Romantis):</strong> Perjalanan cinta manis penuh ketulusan, kisah asmara masa muda, hingga cinta sejati yang melewati berbagai rintangan hidup.</li>
            <li><strong>Sci-Fi (Fiksi Ilmiah):</strong> Eksplorasi luar angkasa tak berbatas, teknologi masa depan, robot kecerdasan buatan (AI), penjelajahan waktu, dan masa depan distopia.</li>
            <li><strong>Thriller:</strong> Ketegangan psikologis intens yang membuat jantung berdegup kencang, perburuan pembunuh berantai, dan aksi pelarian dari bahaya maut.</li>
            <li><strong>War (Perang):</strong> Realitas medan pertempuran militer, heroisme prajurit di garis depan, dan sisi kemanusiaan di balik dentuman senjata.</li>
            <li><strong>Western (Koboi):</strong> Duel senjata cepat di tanah gersang Amerika kuno, perburuan buronan, dan kehidupan koboi yang menantang bahaya.</li>
          </ul>
        </article>

        <article>
          <h3>3. Koleksi Drama Korea (Drakor), Anime Jepang, & TV Series Mancanegara</h3>
          <p>
            Bagi pecinta serial bersambung, EMOVIES menyediakan episode terlengkap dengan takarir bahasa Indonesia yang akurat:
          </p>
          <ul>
            <li><strong>Drama Korea (Drakor) Ongoing & Tamat:</strong> Serial komedi romantis, melodrama, thriller hukum, dan sageuk (sejarah kerajaan) dari stasiun televisi tvN, JTBC, SBS, KBS, hingga serial original Netflix.</li>
            <li><strong>Anime Subtitle Indonesia:</strong> Judul anime musiman (seasonal anime) paling dinantikan mulai dari genre Shonen, Isekai, Seinen, hingga film animasi layar lebar Jepang.</li>
            <li><strong>Serial TV Barat Terpopuler:</strong> Serial TV berating tinggi dari studio HBO, Amazon Prime Video, Disney+, Apple TV+, dan Netflix dari Season awal hingga Season pemungkas.</li>
          </ul>
        </article>

        <article>
          <h3>4. Keunggulan Teknologi Streaming Video EMOVIES</h3>
          <p>
            EMOVIES mengintegrasikan berbagai kemudahan teknis agar proses menonton berjalan menyenangkan:
          </p>
          <ul>
            <li><strong>Penyedia Multi-Server Handal:</strong> Didukung berbagai server embed seperti VidSrc dan CineSrc. Pengguna dapat berganti server pemutar secara instan jika mengalami kendala jaringan.</li>
            <li><strong>Kualitas Gambar Adaptif:</strong> Menyesuaikan kecepatan internet pengguna secara cerdas, mendukung resolusi 360p, 720p HD hemat kuota, hingga 1080p Full HD dan 4K berkejernihan tinggi.</li>
            <li><strong>Desain Antarmuka Dark Mode Modern:</strong> Tampilan gelap sinematik yang ramah di mata, tata letak responsif untuk kenyamanan layar sentuh smartphone Android, iOS, tablet, maupun layar PC.</li>
            <li><strong>Fitur Touch-Lock & Fullscreen:</strong> Tombol kunci layar sentuh di perangkat seluler agar film tidak sengaja terhenti saat tersentuh jari saat menonton mode layar penuh.</li>
            <li><strong>Dukungan Unduh Subtitle Mandiri:</strong> Menyediakan tombol unduh file subtitle (.SRT) bahasa Indonesia untuk diputar di aplikasi pemutar offline kesayangan Anda.</li>
          </ul>
        </article>

        <article>
          <h3>5. Tanya Jawab Seputar Layanan Streaming EMOVIES (FAQ)</h3>
          <dl>
            <dt><strong>Apakah menonton film dan serial TV di EMOVIES benar-benar gratis?</strong></dt>
            <dd>Ya, seluruh katalog film dan serial televisi di EMOVIES dapat dinikmati 100% gratis tanpa perlu membuat akun, memasukkan kartu kredit, ataupun membayar biaya langganan.</dd>

            <dt><strong>Bagaimana cara mengatasi video yang lambat atau mengalami buffering?</strong></dt>
            <dd>Pastikan sambungan internet Anda cukup stabil. Jika video masih tersendat, klik menu server di atas pemutar video dan pilih server alternatif seperti CineSrc atau VidSrc.</dd>

            <dt><strong>Apakah semua film di EMOVIES sudah dilengkapi subtitle bahasa Indonesia?</strong></dt>
            <dd>Benar, hampir semua film dan serial di EMOVIES telah dilengkapi takarir bahasa Indonesia (Sub Indo) yang terpasang otomatis di layar pemutar video.</dd>

            <dt><strong>Seberapa sering koleksi film dan serial di EMOVIES diupdate?</strong></dt>
            <dd>Koleksi kami diperbarui setiap hari dengan judul-judul film bioskop box office 2026 terbaru dan episode drama berseri yang baru saja ditayangkan.</dd>

            <dt><strong>Apakah EMOVIES bisa dibuka di ponsel HP Android dan iPhone?</strong></dt>
            <dd>Tentu saja. EMOVIES dirancang sepenuhnya mobile-friendly untuk kenyamanan menonton di layar ponsel pintar Android, iPhone, iPad, tablet, dan PC laptop.</dd>

            <dt><strong>Bagaimana cara mencari judul film atau aktor kesukaan di EMOVIES?</strong></dt>
            <dd>Gunakan ikon kaca pembesar (Pencarian) di bagian navigasi atas. Ketikkan judul film, nama aktor, sutradara, atau genre untuk menemukan film secara kilat.</dd>
          </dl>
        </article>

        <article>
          <h3>6. Glosarium Istilah Populer Dunia Streaming Film</h3>
          <ul>
            <li><strong>Sub Indo:</strong> Singkatan dari Subtitle Indonesia, yaitu teks terjemahan dialog film ke dalam bahasa Indonesia.</li>
            <li><strong>Full Movie:</strong> Menunjukkan bahwa film ditayangkan lengkap berdurasi utuh dari babak pembuka hingga kredit akhir.</li>
            <li><strong>CAM / HD-CAM:</strong> Kualitas video hasil rekaman kamera awal di gedung bioskop saat film baru pertama kali tayang.</li>
            <li><strong>WEB-DL / WEBRip:</strong> Kualitas visual jernih hasil rekaman platform streaming digital resmi berkualitas tajam tanpa watermark.</li>
            <li><strong>BluRay (BD) 1080p:</strong> Standar resolusi dan kualitas visual terbaik dengan ketajaman warna detail dan audio berkualitas tinggi.</li>
            <li><strong>IMDb Score:</strong> Skor penilaian dan rating kepuasan film dari jutaan penonton di database perfilman dunia IMDb.</li>
          </ul>
        </article>
      </section>

      {/* Structured Data: FAQPage JSON-LD Schema for Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Apakah menonton film dan serial TV di EMOVIES benar-benar gratis?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Ya, seluruh katalog film dan serial televisi di EMOVIES dapat dinikmati 100% gratis tanpa perlu membuat akun, memasukkan kartu kredit, ataupun membayar biaya langganan."
                }
              },
              {
                "@type": "Question",
                "name": "Bagaimana cara mengatasi video yang lambat atau mengalami buffering?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Pastikan sambungan internet Anda cukup stabil. Jika video masih tersendat, klik menu server di atas pemutar video dan pilih server alternatif seperti CineSrc atau VidSrc."
                }
              },
              {
                "@type": "Question",
                "name": "Apakah semua film di EMOVIES sudah dilengkapi subtitle bahasa Indonesia?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Benar, hampir semua film dan serial di EMOVIES telah dilengkapi takarir bahasa Indonesia (Sub Indo) yang terpasang otomatis di layar pemutar video."
                }
              },
              {
                "@type": "Question",
                "name": "Seberapa sering koleksi film dan serial di EMOVIES diupdate?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Koleksi kami diperbarui setiap hari dengan judul-judul film bioskop box office 2026 terbaru dan episode drama berseri yang baru saja ditayangkan."
                }
              },
              {
                "@type": "Question",
                "name": "Apakah EMOVIES bisa dibuka di ponsel HP Android dan iPhone?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Tentu saja. EMOVIES dirancang sepenuhnya mobile-friendly untuk kenyamanan menonton di layar ponsel pintar Android, iPhone, iPad, tablet, dan PC laptop."
                }
              },
              {
                "@type": "Question",
                "name": "Bagaimana cara mencari judul film atau aktor kesukaan di EMOVIES?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Gunakan ikon kaca pembesar (Pencarian) di bagian navigasi atas. Ketikkan judul film, nama aktor, sutradara, atau genre untuk menemukan film secara kilat."
                }
              }
            ]
          })
        }}
      />
    </div>
  );
}

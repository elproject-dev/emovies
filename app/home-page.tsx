'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Play, Info, Star, ChevronRight, PlayCircle, Film, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/loading-spinner';

const VideoCard = ({ video }: { video: any }) => {
  const router = useRouter();
  return (
    <div onClick={() => router.push(`/movie/watch?id=${video.id}`)} className="group flex flex-col gap-3 cursor-pointer w-full">

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

    </div>
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
      className="relative w-full h-[55vh] md:h-[80vh] group mb-12 select-none"
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
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>

              {/* Content Aligned with Max-Width */}
              <div className="absolute inset-0 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 md:pb-20 pointer-events-none">
                <div className="w-full md:w-2/3 pointer-events-auto">
                  {/* Meta Badges */}
                  {(video.year || video.score || video.imdb_score) && (
                    <div className="flex items-center gap-2 mb-2.5">
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

                  <h2 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-2 md:mb-4 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)] line-clamp-2">
                    {video.title}
                  </h2>
                  <p className="text-gray-300 text-xs sm:text-sm md:text-base line-clamp-2 md:line-clamp-3 mb-4 md:mb-6 max-w-2xl">
                    {video.description || "No description available for this movie."}
                  </p>
                  <div className="flex items-center gap-2 md:gap-3">
                    <Link href={`/movie/watch?id=${video.id}&play=true`} className="bg-green-500 hover:bg-green-400 text-white font-bold text-xs sm:text-sm md:text-base py-2 px-4 md:py-3 md:px-8 flex items-center gap-1.5 md:gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)]">
                      <Play className="w-4 h-4 md:w-5 md:h-5 fill-white" /> Play Now
                    </Link>
                    <Link href={`/movie/watch?id=${video.id}`} className="bg-[#222]/80 hover:bg-[#333] backdrop-blur-md border border-gray-600 text-white font-medium text-xs sm:text-sm md:text-base py-2 px-4 md:py-3 md:px-8 flex items-center gap-1.5 md:gap-2 transition-colors">
                      <Info className="w-4 h-4 md:w-5 md:h-5" /> More Info
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* Navigation Dots & Next Button */}
      <div className="absolute bottom-2.5 sm:bottom-6 left-0 right-0 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between sm:justify-start gap-3">
        <div className="flex items-center gap-2">
          {videos.map((_, idx) => {
            const isActive = currentIndex === idx || (currentIndex === extendedVideos.length - 1 && idx === 0);
            return (
              <button
                key={idx}
                onClick={() => {
                  setIsTransitioning(true);
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all ${isActive ? 'bg-green-500 w-8 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-gray-500/50 w-2 hover:bg-gray-400'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>

        {videos.length > 1 && (
          <button
            onClick={handleNext}
            className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-black/60 hover:bg-green-500 text-gray-300 hover:text-black border border-white/20 hover:border-green-400 flex items-center justify-center transition-all backdrop-blur-md shadow-md sm:ml-1"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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

const selectHeroVideos = (videoList: any[]) => {
  if (videoList.length === 0) return [];
  const featuredPool = videoList.filter((v: any) => v.is_featured === true);
  if (featuredPool.length >= 3) {
    return [...featuredPool].sort(() => 0.5 - Math.random()).slice(0, 8);
  } else {
    const backdropVideos = videoList.filter((v: any) => v.backdrop_url && !featuredPool.some((f: any) => f.id === v.id));
    const randomBackdrops = [...backdropVideos].sort(() => 0.5 - Math.random());
    const combined = [...featuredPool, ...randomBackdrops].slice(0, 8).sort(() => 0.5 - Math.random());
    if (combined.length > 0) return combined;
    return [...videoList].sort(() => 0.5 - Math.random()).slice(0, 8);
  }
};

export default function Home() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  const typeFilter = searchParams?.get('type') || '';
  const genreFilter = searchParams?.get('genre') || '';
  const viewFilter = searchParams?.get('view') || '';

  const [videos, setVideos] = useState<any[]>([]);
  const [heroVideos, setHeroVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        let request = supabase.from('videos').select('*');

        if (query) {
          request = request.ilike('title', `%${query}%`).order('created_at', { ascending: false }).limit(100);
        } else if (genreFilter) {
          // Asumsi ada kolom genre atau category yang mengandung teks ini
          request = request.ilike('genre', `%${genreFilter}%`).order('created_at', { ascending: false }).limit(200);
        } else if (typeFilter) {
          // Both 'movie' (dari TMDB) and 'film' (kategori lokal streamx) are considered movies
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
          // Default homepage: fetch movie dan TV terpisah agar seimbang
          const [moviesRes, tvRes, featuredRes] = await Promise.all([
            supabase.from('videos').select('*').in('content_type', ['movie', 'film']).order('created_at', { ascending: false }).limit(150),
            supabase.from('videos').select('*').eq('content_type', 'tv').order('created_at', { ascending: false }).limit(50),
            supabase.from('videos').select('*').eq('is_featured', true).order('created_at', { ascending: false }).limit(50),
          ]);

          if (moviesRes.error) throw moviesRes.error;

          const mergedIds = new Set<string>();
          const merged: any[] = [];

          // Gabungkan movie + TV + featured tanpa duplikat
          for (const list of [moviesRes.data, tvRes.data, featuredRes.data]) {
            for (const v of (list || [])) {
              if (!mergedIds.has(v.id)) {
                mergedIds.add(v.id);
                merged.push(v);
              }
            }
          }

          const selectedHero = selectHeroVideos(merged);
          setVideos(merged);
          setHeroVideos(selectedHero);
          setIsLoading(false);
          return;
        }

        const { data, error } = await request;
        if (error) throw error;
        const list = data || [];
        const selectedHero = selectHeroVideos(list);
        setVideos(list);
        setHeroVideos(selectedHero);
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

  // Row 2: Trending Now — khusus movie, shuffle 30 teratas berdasarkan view_count
  const trendingPool = [...videos]
    .filter(v => !usedIds.has(v.id) && v.content_type !== 'tv')
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 30)
    .sort(() => 0.5 - Math.random());
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
      <h1 className="sr-only">EMOVIES - Nonton Film &amp; TV Series Streaming Sub Indo Gratis</h1>
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
              <HeroCarousel videos={heroVideos} />
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
    </div>
  );
}

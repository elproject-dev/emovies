'use client';

import { useState, useEffect, useRef, use, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Play, AlertCircle, Download, Search, X, Captions, Database, ChevronDown, Maximize, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';
import { trackWatchMovie } from '@/lib/analytics';

function WatchContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id');
  const shouldPlay = searchParams?.get('play') === 'true';

  const [video, setVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(shouldPlay);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isUnlockVisible, setIsUnlockVisible] = useState(false);

  const toolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetToolbarTimer = () => {
    if (isLocked) {
      setIsUnlockVisible(true);
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = setTimeout(() => {
        setIsUnlockVisible(false);
      }, 3500);
      return;
    }

    setIsToolbarVisible(true);
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
    toolbarTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setIsToolbarVisible(false);
      }
    }, 4000);
  };

  const hasTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPlaying) {
      resetToolbarTimer();
      if (video?.id && video?.title && hasTrackedRef.current !== video.id) {
        hasTrackedRef.current = video.id;
        trackWatchMovie(video.title, video.tmdb_id, video.content_type || video.category || 'movie', video.id);
      }
    } else {
      setIsToolbarVisible(true);
      if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    }
    return () => {
      if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    };
  }, [isPlaying, video?.id, video?.title]);

  // Sync fullscreen state with device back button / swipe gestures
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsNativeFullscreen(isFull);

      if (!isFull && Capacitor.isNativePlatform()) {
        // If exiting fullscreen (e.g., via Android Back button), force portrait then unlock, and show status bar
        ScreenOrientation.lock({ orientation: 'portrait' }).then(() => {
          ScreenOrientation.unlock().catch(() => { });
        }).catch(() => {
          ScreenOrientation.unlock().catch(() => { });
        });
        StatusBar.show().catch(() => { });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Nonaktifkan pull-to-refresh di Android saat berada di halaman tonton / video player
  useEffect(() => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.AndroidApp && window.AndroidApp.setSwipeRefreshEnabled) {
      // @ts-ignore
      window.AndroidApp.setSwipeRefreshEnabled(false);
    }
    return () => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.AndroidApp && window.AndroidApp.setSwipeRefreshEnabled) {
        // @ts-ignore
        window.AndroidApp.setSwipeRefreshEnabled(true);
      }
    };
  }, []);

  // SEO: Update dynamic document title, meta description & Schema.org JSON-LD
  useEffect(() => {
    if (!video?.title) return;

    const movieTitle = video.title;
    const movieYear = video.year ? ` (${video.year})` : '';
    document.title = `Nonton ${movieTitle}${movieYear} Sub Indo Full Movie Streaming - EMOVIES`;

    // Dynamic meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    const snippet = video.description ? video.description.slice(0, 160) : `Nonton film ${movieTitle} streaming subtitle indonesia gratis`;
    metaDesc.setAttribute('content', `Nonton ${movieTitle}${movieYear} sub indo full movie streaming gratis di EMOVIES. ${snippet}`);

    // Dynamic canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `${window.location.origin}/movie/watch?id=${video.id}`);

    // Dynamic Schema.org JSON-LD
    const scriptId = 'movie-rich-snippet';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const isTv = video.content_type === 'tv' || video.season;
    const schemaData = {
      "@context": "https://schema.org",
      "@type": isTv ? "TVSeries" : "Movie",
      "name": movieTitle,
      "alternateName": `Nonton ${movieTitle} Sub Indo`,
      "description": video.description || `Nonton ${movieTitle} subtitle Indonesia online gratis di EMOVIES`,
      "image": video.poster_url || video.thumbnail_url || video.backdrop_url || "https://emovies.elproject.studio/emo.png",
      "datePublished": video.year?.toString() || "2024",
      "genre": video.genre ? video.genre.split(',').map((g: string) => g.trim()) : undefined,
      "aggregateRating": (video.score || video.imdb_score) ? {
        "@type": "AggregateRating",
        "ratingValue": Number(video.score || video.imdb_score).toFixed(1),
        "bestRating": "10",
        "ratingCount": Math.max(15, (video.view_count || 1) * 8)
      } : undefined,
      "potentialAction": {
        "@type": "WatchAction",
        "target": typeof window !== 'undefined' ? window.location.href : `https://emovies.elproject.studio/movie/watch?id=${video.id}`
      }
    };

    script.text = JSON.stringify(schemaData);

    return () => {
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, [video]);
  const [serverUrls, setServerUrls] = useState<{ name: string, url: string }[]>([
    { name: 'VidSrc', url: 'https://vidsrc.me/embed/' },
    { name: 'CineSrc', url: 'https://cinesrc.st/embed/' }
  ]);
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  // Subtitles
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [isSearchingSubs, setIsSearchingSubs] = useState(false);
  const [isDownloadingSubs, setIsDownloadingSubs] = useState<string | null>(null);
  const [subtitleLang, setSubtitleLang] = useState('id');

  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVideoAndSettings = async () => {
      if (!id) return;
      try {
        const [videoRes, settingsRes] = await Promise.all([
          supabase.from('videos').select('*').eq('id', id).single(),
          supabase.from('app_settings').select('player_url').eq('id', 'global').single()
        ]);

        if (videoRes.error) throw videoRes.error;
        setVideo(videoRes.data);

        if (!settingsRes.error && settingsRes.data?.player_url) {
          try {
            if (settingsRes.data.player_url.startsWith('[')) {
              const parsed = JSON.parse(settingsRes.data.player_url);
              if (parsed.length > 0) setServerUrls(parsed);
            } else {
              const urls = settingsRes.data.player_url
                .split(',')
                .map((u: string) => u.trim())
                .filter((u: string) => u.length > 0);
              if (urls.length > 0) {
                setServerUrls(urls.map((u: string) => ({ name: '', url: u })));
              }
            }
          } catch (e) {
            const urls = settingsRes.data.player_url
              .split(',')
              .map((u: string) => u.trim())
              .filter((u: string) => u.length > 0);
            if (urls.length > 0) {
              setServerUrls(urls.map((u: string) => ({ name: '', url: u })));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideoAndSettings();
  }, [id]);

  const handleSearchSubtitles = async (forceLang?: string) => {
    const currentLang = forceLang || subtitleLang;

    setIsSearchingSubs(true);
    setShowSubtitleMenu(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENSUBTITLES_API_KEY;
      if (!apiKey) throw new Error('API Key opensubtitles belum diatur');

      const isTv = video.content_type === 'tv' || video.season;
      const params = new URLSearchParams({
        tmdb_id: video.tmdb_id.toString(),
        languages: currentLang,
        type: isTv ? 'episode' : 'movie'
      });

      if (isTv) {
        params.append('season_number', (video.season || 1).toString());
        params.append('episode_number', (video.episode || 1).toString());
      }

      const response = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${params.toString()}`, {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'StreamX v1.0'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch subtitles');
      const data = await response.json();
      setSubtitles(data.data || []);

    } catch (error) {
      console.error('Subtitle search error:', error);
      alert('Gagal mencari subtitle. Pastikan API key sudah diatur.');
    } finally {
      setIsSearchingSubs(false);
    }
  };

  const handleDownloadSubtitle = async (fileId: string, fileName: string) => {
    setIsDownloadingSubs(fileId);
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENSUBTITLES_API_KEY;
      const response = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey || '',
          'Content-Type': 'application/json',
          'User-Agent': 'StreamX v1.0'
        },
        body: JSON.stringify({ file_id: fileId })
      });

      if (!response.ok) throw new Error('Failed to get download link');
      const data = await response.json();

      if (data.link) {
        let finalName = fileName || 'subtitle.srt';
        if (!finalName.toLowerCase().endsWith('.srt')) {
          finalName += '.srt';
        }

        // Fetch konten subtitle terlebih dahulu agar bisa disimpan sebagai file
        const subRes = await fetch(data.link);
        if (!subRes.ok) throw new Error('Gagal mengunduh konten subtitle');
        const subText = await subRes.text();

        // @ts-ignore
        if (typeof window !== 'undefined' && window.AndroidApp && window.AndroidApp.saveFile) {
          // Untuk Android native: kirim base64 ke MainActivity.java
          const base64Data = btoa(unescape(encodeURIComponent(subText)));
          // @ts-ignore
          window.AndroidApp.saveFile(finalName, base64Data);
        } else {
          // Browser biasa: buat Blob URL agar download otomatis tanpa buka tab baru
          const blob = new Blob([subText], { type: 'text/plain; charset=utf-8' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = finalName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Bersihkan Blob URL setelah digunakan
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        }
      } else {
        throw new Error('No download link received');
      }
    } catch (error) {
      console.error('Subtitle download error:', error);
      alert('Gagal mengambil file subtitle');
    } finally {
      setIsDownloadingSubs(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Memuat Data" />;
  }

  if (!video) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Movie not found</h1>
        <Link href="/" className="mt-4 text-green-400 hover:underline">Return to Home</Link>
      </div>
    );
  }

  // Generate URL based on active server
  const isTV = video.content_type === 'tv' || video.season;
  const safeIndex = activeServerIndex >= serverUrls.length ? 0 : activeServerIndex;
  let currentBaseUrl = serverUrls[safeIndex]?.url || 'https://vidsrc.me/embed/';
  if (!currentBaseUrl.endsWith('/')) currentBaseUrl += '/';

  let vidsrcUrl = "";
  if (currentBaseUrl.includes('cinesrc')) {
    vidsrcUrl = isTV
      ? `${currentBaseUrl}tv/${video.tmdb_id}?s=${video.season || 1}&e=${video.episode || 1}`
      : `${currentBaseUrl}movie/${video.tmdb_id}`;
  } else if (currentBaseUrl.includes('vidsrc.me') || currentBaseUrl.includes('vidsrc.to') || currentBaseUrl.includes('vidsrc.pm') || currentBaseUrl.includes('vidsrc.net')) {
    vidsrcUrl = isTV
      ? `${currentBaseUrl}tv?tmdb=${video.tmdb_id}&season=${video.season || 1}&episode=${video.episode || 1}`
      : `${currentBaseUrl}movie?tmdb=${video.tmdb_id}`;
  } else {
    // Fallback URL pattern for other providers (e.g. vidlink, vidplay)
    vidsrcUrl = isTV
      ? `${currentBaseUrl}tv/${video.tmdb_id}/${video.season || 1}/${video.episode || 1}`
      : `${currentBaseUrl}movie/${video.tmdb_id}`;
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] text-white">
      {!isPlaying ? (
        <div className="relative w-full h-screen flex flex-col justify-start pt-[25vh] md:pt-[28vh]">
          {/* Backdrop Image */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src={video.backdrop_url || video.thumbnail_url || video.poster_url}
              alt={`Nonton ${video.title} (${video.year || '2024'}) Sub Indo Full Movie Streaming`}
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlays: Darken left for text readability, fade bottom to background color */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
          </div>

          {/* Frame Tombol Kembali (Terpisah dari Judul agar bisa diatur tingginya) */}
          <div className="absolute top-[12vh] md:top-[15vh] left-0 right-0 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 z-20 pointer-events-none">
            <Link
              href="/"
              className="inline-flex w-12 h-12 rounded-full bg-black/60 hover:bg-green-500 hover:text-black flex items-center justify-center transition-all border border-white/10 hover:border-green-400 backdrop-blur-md pointer-events-auto group"
            >
              <ArrowLeft className="w-6 h-6 text-white group-hover:text-black transition-colors" />
            </Link>
          </div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-full md:w-3/4 lg:w-1/2">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">
                {video.title}
              </h1>

              <div className="flex items-center gap-4 text-sm md:text-base text-gray-300 mb-2 font-medium">
                <span className="border border-green-500/40 text-green-400 px-2 py-0.5 text-xs">
                  {(video.score || video.imdb_score) ? `⭐ ${Number(video.score || video.imdb_score).toFixed(1)}` : 'NR'}
                </span>
                <span>{video.year || "2024"}</span>
                <span>{video.duration ? video.duration : (isTV ? `S${video.season || 1} E${video.episode || 1}` : 'Movie')}</span>
              </div>

              {video.genre && (
                <div className="flex items-center flex-wrap gap-2 text-sm text-gray-400 mb-6">
                  <span>{video.genre}</span>
                </div>
              )}

              <p className="text-gray-300 text-sm md:text-lg mb-8 leading-relaxed">
                {video.description || "No description available for this content."}
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(true)}
                  className="bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-6 md:py-4 md:px-10 rounded-none flex items-center gap-2 md:gap-3 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.8)] text-base md:text-lg"
                >
                  <Play className="w-5 h-5 md:w-6 md:h-6 fill-white" /> PLAY MOVIES
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Video Player Container */
        <div
          ref={playerRef}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center select-none"
          style={{ overscrollBehavior: 'none', touchAction: 'pan-x pan-y' }}
          onMouseMove={resetToolbarTimer}
          onClick={resetToolbarTimer}
          onTouchStart={resetToolbarTimer}
        >

          {/* Top Bar (Kembali & Judul) */}
          <div
            className={`absolute top-0 left-0 p-4 sm:p-6 z-[110] transition-all duration-300 pointer-events-none ${isToolbarVisible ? 'opacity-100' : 'opacity-35 hover:opacity-100'}`}
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
          >
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onClick={async () => {
                  setIsPlaying(false);
                  if (document.fullscreenElement) {
                    await document.exitFullscreen().catch(() => { });
                  }
                  if (Capacitor.isNativePlatform()) {
                    ScreenOrientation.lock({ orientation: 'portrait' }).then(() => {
                      ScreenOrientation.unlock().catch(() => { });
                    }).catch(() => { });
                    StatusBar.show().catch(() => { });
                  }
                }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors border border-white/10 backdrop-blur-md shadow-lg"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              {video?.title && (
                <div className="hidden md:flex flex-col drop-shadow">
                  <span className="text-sm font-semibold text-white truncate max-w-xs">{video.title}</span>
                  <span className="text-xs text-gray-400">
                    {isTV ? `S${video.season || 1} E${video.episode || 1}` : (video.year || '')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Middle-Left Controls (Subtitle, Server, Lock, Fullscreen) */}
          <div
            className={`absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex flex-col items-start gap-2.5 z-[110] transition-all duration-300 pointer-events-auto ${isToolbarVisible
              ? 'opacity-100'
              : 'opacity-35 hover:opacity-100'
              }`}
          >
            {/* Subtitle Button */}
            <div className="relative">
              <button
                onClick={() => {
                  handleSearchSubtitles();
                  setShowServerMenu(false);
                  resetToolbarTimer();
                }}
                className="bg-black/60 hover:bg-black/80 border border-white/10 hover:border-green-500/50 backdrop-blur-md px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-white shadow-lg group"
                title="Subtitle"
              >
                <Captions className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-green-400 transition-colors ${isSearchingSubs ? 'animate-pulse text-green-400' : ''}`} />
                <span className="text-xs sm:text-sm font-semibold">Subtitle</span>
              </button>
            </div>

            {/* Server Selector Dropdown */}
            {serverUrls.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowServerMenu(!showServerMenu);
                    setShowSubtitleMenu(false);
                    resetToolbarTimer();
                  }}
                  className="bg-black/60 hover:bg-black/80 border border-white/10 hover:border-green-500/50 backdrop-blur-md px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-white shadow-lg group"
                  title="Server"
                >
                  <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 group-hover:text-green-400 transition-colors" />
                  <span className="text-xs sm:text-sm font-semibold">Server</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showServerMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Server Menu Overlay (Membuka ke kanan dari tombol server tengah kiri) */}
                {showServerMenu && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-48 sm:w-56 bg-[#111]/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl z-[130] overflow-hidden flex flex-col max-h-[60vh]">
                    <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-black/50">
                      <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                        <Database className="w-3.5 h-3.5 text-green-500" /> Pilih Server
                      </h3>
                      <button onClick={() => setShowServerMenu(false)} className="text-gray-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {serverUrls.map((server, index) => {
                        let serverName = server.name;
                        if (!serverName) {
                          serverName = `Server ${index + 1}`;
                          const url = server.url || '';
                          if (url.includes('vidlink')) serverName = 'VidLink';
                          else if (url.includes('autoembed')) serverName = 'AutoEmbed';
                          else if (url.includes('vidsrc')) serverName = 'VidSrc';
                          else if (url.includes('smashy')) serverName = 'Smashy';
                          else if (url.includes('flix')) serverName = 'Flix';
                          else if (url.includes('vidplay')) serverName = 'VidPlay';
                          else if (url.includes('xpass')) serverName = 'XPass';
                          else if (url.includes('cinesrc')) serverName = 'CineSrc';
                          else if (url.includes('vsembed')) serverName = 'VSEmbed';
                          else if (url.includes('vixsrc')) serverName = 'VixSrc';
                          else if (url.includes('vidzee')) serverName = 'Vidzee';
                          else if (url.includes('primesrc')) serverName = 'PrimeSrc';
                          else if (url.includes('vidsrc.win')) serverName = 'VidSrc.Win';
                          else if (url.includes('vidy.st')) serverName = 'Vidy';
                          else if (url.includes('embed.filmu.in')) serverName = 'Filmu';
                          else if (url.includes('embedmaster.link')) serverName = 'EmbedMaster';

                        }

                        return (
                          <button
                            key={index}
                            onClick={() => {
                              setActiveServerIndex(index);
                              setShowServerMenu(false);
                              resetToolbarTimer();
                            }}
                            className={`w-full text-left p-2.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-between ${activeServerIndex === index
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'text-gray-300 hover:bg-gray-800/50 border border-transparent hover:border-gray-700'
                              }`}
                          >
                            <span className="truncate pr-2">{serverName}</span>
                            {activeServerIndex === index && (
                              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lock Button (Khusus Android) */}
            {Capacitor.isNativePlatform() && (
              <button
                onClick={() => {
                  setIsLocked(true);
                  setIsToolbarVisible(false);
                  setShowServerMenu(false);
                  setShowSubtitleMenu(false);
                }}
                className="bg-black/60 hover:bg-black/80 border border-white/10 hover:border-green-500/50 backdrop-blur-md px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-white shadow-lg group"
                title="Kunci Layar"
              >
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-green-400 transition-colors" />
                <span className="text-xs sm:text-sm font-semibold">Lock</span>
              </button>
            )}

            {/* Fullscreen Button (Khusus Android) */}
            {Capacitor.isNativePlatform() && (
              <button
                onClick={async () => {
                  try {
                    if (!document.fullscreenElement) {
                      // Enter fullscreen: lock landscape, hide status bar, request fullscreen natively
                      await ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => { });
                      await StatusBar.hide().catch(() => { });
                      await document.documentElement.requestFullscreen().catch(() => { });
                    } else {
                      // Exit fullscreen: document.exitFullscreen() will trigger the 'fullscreenchange' listener
                      // which handles ScreenOrientation.unlock() and StatusBar.show()
                      await document.exitFullscreen().catch(() => { });
                    }
                  } catch (err) {
                    console.error("Error toggling native fullscreen:", err);
                  }
                }}
                className="bg-black/60 hover:bg-black/80 border border-white/10 hover:border-green-500/50 backdrop-blur-md px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-white shadow-lg group"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-green-400 transition-colors" />
                <span className="text-xs sm:text-sm font-semibold">Fullscreen</span>
              </button>
            )}
          </div>

          {/* Subtitle Menu Overlay (Membuka di sebelah dock tengah kiri) */}
          {showSubtitleMenu && (
            <div className="absolute left-32 sm:left-48 top-1/2 -translate-y-1/2 w-80 max-w-[calc(100vw-9rem)] bg-[#111]/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl z-[130] overflow-hidden flex flex-col max-h-[75vh]">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/50">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                    <Captions className="w-5 h-5 text-green-500" /> Subtitle
                  </h3>
                  <select
                    value={subtitleLang}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setSubtitleLang(newLang);
                      handleSearchSubtitles(newLang);
                    }}
                    className="bg-gray-800 text-xs text-white px-2 py-1 rounded border border-gray-700 outline-none cursor-pointer"
                  >
                    <option value="id">Indonesia</option>
                    <option value="en">English</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="th">Thai</option>
                    <option value="vi">Vietnamese</option>
                    <option value="tl">Tagalog</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                  </select>
                </div>
                <button onClick={() => setShowSubtitleMenu(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {isSearchingSubs ? (
                  <div className="py-8 flex flex-col items-center justify-center text-gray-400">
                    <Search className="w-8 h-8 animate-pulse mb-3 opacity-50" />
                    <p className="text-sm font-medium">Mencari subtitle...</p>
                  </div>
                ) : subtitles.length > 0 ? (
                  <div className="space-y-2">
                    {subtitles.map((sub) => {
                      const file = sub.attributes?.files?.[0];
                      if (!file) return null;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleDownloadSubtitle(file.file_id, file.file_name)}
                          disabled={isDownloadingSubs === file.file_id}
                          className="w-full text-left p-3 rounded-lg hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-700 group flex items-center justify-between"
                        >
                          <div className="flex flex-col pr-4 overflow-hidden">
                            <span className="text-sm font-semibold text-white truncate w-full" title={sub.attributes.release || 'Subtitle'}>
                              {sub.attributes.release || 'Subtitle Default'}
                            </span>
                            <span className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{sub.attributes.language}</span>
                              <span className="truncate">{file.file_name}</span>
                            </span>
                          </div>
                          {isDownloadingSubs === file.file_id ? (
                            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                          ) : (
                            <Download className="w-5 h-5 text-gray-600 group-hover:text-green-500 shrink-0 transition-colors" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <p className="text-sm font-medium">Subtitle tidak ditemukan.</p>
                  </div>
                )}
              </div>
              {subtitles.length > 0 && (
                <div className="p-3 bg-black/50 border-t border-gray-800 text-center">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Powered by OpenSubtitles</span>
                </div>
              )}
            </div>
          )}

          {/* Lock Overlay: Menangkap sentuhan saat dikunci agar tidak ada yang terpencet */}
          {isLocked && (
            <div
              className="absolute inset-0 z-[105] pointer-events-auto cursor-default bg-black/20"
              onClick={resetToolbarTimer}
              onTouchStart={resetToolbarTimer}
            />
          )}

          {/* Unlock Button Overlay (Muncul hanya saat dikunci & disentuh) */}
          {isLocked && (
            <div className={`absolute top-4 sm:top-6 left-4 sm:left-6 z-[120] transition-opacity duration-300 pointer-events-none ${isUnlockVisible ? 'opacity-100' : 'opacity-0'}`}>
              <button
                onClick={() => {
                  setIsLocked(false);
                  setIsUnlockVisible(false);
                  resetToolbarTimer();
                }}
                className="pointer-events-auto bg-black/60 hover:bg-black/80 border border-white/10 backdrop-blur-md px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-transform active:scale-95 shadow-xl"
              >
                <Unlock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                <span className="text-white text-xs sm:text-sm font-semibold">Unlock</span>
              </button>
            </div>
          )}

          <iframe
            src={vidsrcUrl}
            className="w-full h-full max-w-full max-h-full aspect-video border-none"
            allow="encrypted-media; autoplay *; fullscreen *; picture-in-picture"
            allowFullScreen
            style={{ overscrollBehavior: 'none' }}
          />
        </div>
      )}
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading Movie..." />}>
      <WatchContent />
    </Suspense>
  );
}

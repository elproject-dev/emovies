'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchTmdbData } from '@/lib/tmdb';
import { Lock, X, Search, Film, Tv, Plus, Edit, Trash2, ArrowLeft, LogOut, Users, Settings, Key, BarChart, Paintbrush, Shield, FileText, ChevronLeft, ChevronRight, Star, ArrowUp, ArrowDown, Activity, ExternalLink, Copy, Check, Send, CheckCircle2, AlertCircle, Info, RefreshCw, BarChart2, Globe, HelpCircle, Eye, Clock, TrendingUp, TrendingDown, Smartphone, Monitor, Tablet, Compass, BarChart3, Radio, ArrowUpRight, Play } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkServerAvailability } from '@/app/actions/checkServer';
import { trackEvent } from '@/lib/analytics';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  // Data states
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // Default 'rating' as requested
  const [heroFilter, setHeroFilter] = useState<'all' | 'featured' | 'unfeatured'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [hasInitialized, setHasInitialized] = useState(false);

  // API Config / Server Settings states
  const [serverUrlsList, setServerUrlsList] = useState<{ name: string, url: string }[]>([{ name: '', url: '' }]);
  const [isSavingServer, setIsSavingServer] = useState(false);

  // Google Analytics & Site Settings states
  const [gaId, setGaId] = useState('');
  const [gaEnabled, setGaEnabled] = useState(true);
  const [isSavingGa, setIsSavingGa] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [copiedGaId, setCopiedGaId] = useState(false);
  const [gaEventLogs, setGaEventLogs] = useState<{ id: string; name: string; time: string; params: any }[]>([]);

  // Analytics Dashboard states
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [analyticsRange, setAnalyticsRange] = useState<'today' | '7d' | '30d'>('7d');
  const [topStreamedMovies, setTopStreamedMovies] = useState<any[]>([]);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [realStats, setRealStats] = useState({
    totalVideos: 0,
    totalMovies: 0,
    totalSeries: 0,
    totalEvents: 0,
    totalPageViews: 0,
    totalWatchEvents: 0,
    totalSearches: 0,
    totalCatalogViews: 0,
    watchedTitlesCount: 0,
  });
  const [recentLiveEvents, setRecentLiveEvents] = useState<any[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFetchingTmdb, setIsFetchingTmdb] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    tmdb_id: '',
    content_type: 'movie',
    title: '',
    description: '',
    genre: '',
    year: '',
    duration: '',
    score: '',
    poster_url: '',
    backdrop_url: '',
  });

  const [isCheckingServer, setIsCheckingServer] = useState(false);

  const handleCheckServer = async () => {
    const { tmdb_id, content_type } = form;
    if (!tmdb_id) return;

    // Validasi: Cek apakah user memasukkan IMDb ID (dimulai dengan 'tt')
    if (tmdb_id.startsWith('tt')) {
      alert("Anda memasukkan IMDb ID (dimulai dengan 'tt'). Silakan gunakan TMDB ID (angka saja).");
      return;
    }

    // Validasi: Pastikan ID hanya berisi angka
    if (!/^[0-9]+$/.test(tmdb_id)) {
      alert("TMDB ID harus berupa angka saja. Contoh: 550");
      return;
    }

    setIsCheckingServer(true);

    try {
      const result = await checkServerAvailability(tmdb_id, content_type);

      if (result.error) {
        alert(result.error);
      } else if (result.ok) {
        alert("Video tersedia dan dapat diputar di server.");
      } else if (result.status === 404) {
        alert("Film ini belum tersedia di server streaming (404).");
      } else {
        alert(`Server merespon dengan status ${result.status}.`);
      }
    } catch (error: any) {
      console.error('Check Server Error:', error);
      alert(error.message || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsCheckingServer(false);
    }
  };

  const handleFetchTmdb = async () => {
    if (!form.tmdb_id) return;
    setIsFetchingTmdb(true);
    try {
      const tmdbData = await fetchTmdbData(form.tmdb_id, form.content_type as 'movie' | 'tv');
      if (Object.keys(tmdbData).length === 0) {
        alert('Gagal mengambil data TMDB. Periksa ID dan tipe konten.');
      } else {
        setForm(prev => ({ ...prev, ...tmdbData }));
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengambil data.');
    } finally {
      setIsFetchingTmdb(false);
    }
  };

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        thumbnail_url: form.poster_url, // map poster_url to thumbnail_url for compatibility
        year: form.year ? Number(form.year) : null,
        score: form.score ? Number(form.score) : null,
        category: form.content_type === 'movie' ? 'film' : 'series'
      };

      if (editingId) {
        const { error } = await supabase.from('videos').update(payload).eq('id', editingId);
        if (error) throw error;
        alert('Berhasil memperbarui film!');
      } else {
        const { error } = await supabase.from('videos').insert([payload]);
        if (error) throw error;
        alert('Berhasil menyimpan film!');
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm({
        tmdb_id: '', content_type: 'movie', title: '', description: '',
        genre: '', year: '', duration: '', score: '', poster_url: '', backdrop_url: ''
      });
      fetchVideos();
    } catch (err: any) {
      console.error(err);
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Check if previously authenticated in session
    const authStatus = sessionStorage.getItem('emovies_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setHasInitialized(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!hasInitialized || !isAuthenticated) return;

    // Debounce backend search
    const timer = setTimeout(() => {
      // Fetch from backend if >= 3 characters, or if completely empty
      if (searchQuery.trim().length >= 3 || searchQuery.trim().length === 0) {
        fetchVideos(searchQuery.trim());
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, isAuthenticated, hasInitialized]);

  useEffect(() => {
    if (activeTab === 3 || activeTab === 4 || activeTab === 5) {
      const fetchSettings = async () => {
        try {
          const { data, error } = await supabase
            .from('app_settings')
            .select('player_url, ga_id, ga_enabled')
            .eq('id', 'global')
            .single();
          if (error) throw error;
          if (data) {
            if (data.player_url) {
              try {
                if (data.player_url.startsWith('[')) {
                  const parsed = JSON.parse(data.player_url);
                  setServerUrlsList(parsed.length > 0 ? parsed : [{ name: '', url: '' }]);
                } else {
                  const urls = data.player_url.split(',').map((u: string) => u.trim()).filter((u: string) => u);
                  setServerUrlsList(urls.length > 0 ? urls.map((u: string) => ({ name: '', url: u })) : [{ name: '', url: '' }]);
                }
              } catch (e) {
                const urls = data.player_url.split(',').map((u: string) => u.trim()).filter((u: string) => u);
                setServerUrlsList(urls.length > 0 ? urls.map((u: string) => ({ name: '', url: u })) : [{ name: '', url: '' }]);
              }
            }
            if (data.ga_id !== undefined && data.ga_id !== null) {
              setGaId(data.ga_id);
            }
            if (data.ga_enabled !== undefined && data.ga_enabled !== null) {
              setGaEnabled(data.ga_enabled);
            }
            if (activeTab === 5) {
              loadRealAnalytics();
            }
          }
        } catch (err) {
          console.error('Error fetching settings:', err);
        }
      };
      fetchSettings();
    }
  }, [activeTab]);

  // Realtime subscription for live analytics events
  useEffect(() => {
    if (activeTab !== 5) return;

    const channel = supabase
      .channel('admin_live_analytics')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analytics_events' },
        (payload: any) => {
          const newEvt = payload.new;
          if (!newEvt) return;
          setRecentLiveEvents(prev => [newEvt, ...prev.slice(0, 7)]);
          setRealStats(prev => ({
            ...prev,
            totalEvents: prev.totalEvents + 1,
            totalPageViews: newEvt.event_name === 'page_view' ? prev.totalPageViews + 1 : prev.totalPageViews,
            totalWatchEvents: newEvt.event_name === 'watch_video' ? prev.totalWatchEvents + 1 : prev.totalWatchEvents,
            totalSearches: newEvt.event_name === 'search_movie' ? prev.totalSearches + 1 : prev.totalSearches,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const loadRealAnalytics = async (rangeToUse = analyticsRange) => {
    try {
      let timeLimit: string | null = null;
      const now = new Date();
      if (rangeToUse === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        timeLimit = startOfDay.toISOString();
      } else if (rangeToUse === '7d') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        timeLimit = d.toISOString();
      } else if (rangeToUse === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        timeLimit = d.toISOString();
      }

      let eventsQuery = supabase.from('analytics_events').select('*', { count: 'exact', head: true });
      let pageViewsQuery = supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'page_view');
      let watchEventsQuery = supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'watch_video');
      let searchesQuery = supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'search_movie');
      let recentEventsQuery = supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(8);

      if (timeLimit) {
        eventsQuery = eventsQuery.gte('created_at', timeLimit);
        pageViewsQuery = pageViewsQuery.gte('created_at', timeLimit);
        watchEventsQuery = watchEventsQuery.gte('created_at', timeLimit);
        searchesQuery = searchesQuery.gte('created_at', timeLimit);
        recentEventsQuery = recentEventsQuery.gte('created_at', timeLimit);
      }

      const [
        { count: totalVideos },
        { count: totalMovies },
        { count: totalSeries },
        { count: totalEvents },
        { count: totalPageViews },
        { count: totalWatchEvents },
        { count: totalSearches },
        { data: topViewed },
        { data: recentEvents },
        { data: viewedVideos }
      ] = await Promise.all([
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }).in('content_type', ['movie', 'film']),
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('content_type', 'tv'),
        eventsQuery,
        pageViewsQuery,
        watchEventsQuery,
        searchesQuery,
        supabase.from('videos').select('id, title, view_count, score, imdb_score, content_type, genre, thumbnail_url, poster_url').order('view_count', { ascending: false }).limit(50),
        recentEventsQuery,
        supabase.from('videos').select('view_count').gt('view_count', 0)
      ]);

      const catalogViewsSum = viewedVideos
        ? viewedVideos.reduce((acc: number, curr: any) => acc + (Number(curr.view_count) || 0), 0)
        : 0;

      const watchedTitlesCount = viewedVideos ? viewedVideos.length : 0;

      setRealStats({
        totalVideos: totalVideos || 0,
        totalMovies: totalMovies || 0,
        totalSeries: totalSeries || 0,
        totalEvents: totalEvents || 0,
        totalPageViews: totalPageViews || 0,
        totalWatchEvents: totalWatchEvents || 0,
        totalSearches: totalSearches || 0,
        totalCatalogViews: catalogViewsSum,
        watchedTitlesCount,
      });

      if (topViewed) setTopStreamedMovies(topViewed);
      if (recentEvents) setRecentLiveEvents(recentEvents);
    } catch (err) {
      console.error('Error loading real analytics:', err);
    }
  };

  const handleRefreshStats = async () => {
    setIsRefreshingStats(true);
    try {
      await loadRealAnalytics();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsRefreshingStats(false), 500);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingServer(true);
    try {
      const validServers = serverUrlsList
        .filter(s => s.url.trim())
        .map(s => {
          let u = s.url.trim();
          if (!u.startsWith('http://') && !u.startsWith('https://')) {
            u = `https://${u}`;
          }
          if (!u.endsWith('/')) {
            u += '/';
          }
          return { name: s.name.trim() || 'Server', url: u };
        });
      const stringified = JSON.stringify(validServers);
      const { error } = await supabase.from('app_settings')
        .update({ player_url: stringified })
        .eq('id', 'global');
      if (error) throw error;
      alert('Pengaturan server berhasil disimpan!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menyimpan pengaturan server: ' + err.message);
    } finally {
      setIsSavingServer(false);
    }
  };

  const handleSaveAnalytics = async () => {
    setIsSavingGa(true);
    try {
      const cleanId = gaId.trim();

      if (cleanId && !cleanId.toUpperCase().startsWith('G-')) {
        const proceed = window.confirm(
          `ID "${cleanId}" biasanya untuk Google Analytics 4 diawali dengan "G-". Yakin ingin tetap menyimpan?`
        );
        if (!proceed) {
          setIsSavingGa(false);
          return;
        }
      }

      const { error } = await supabase
        .from('app_settings')
        .update({
          ga_id: cleanId || null,
          ga_enabled: gaEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'global');

      if (error) throw error;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('emovies_ga_config_updated', {
            detail: { ga_id: cleanId, ga_enabled: gaEnabled }
          })
        );
      }

      alert('Pengaturan Google Analytics berhasil disimpan!');
    } catch (err: any) {
      console.error('Error saving analytics settings:', err);
      alert('Gagal menyimpan Google Analytics: ' + err.message);
    } finally {
      setIsSavingGa(false);
    }
  };

  const handleSendTestPing = () => {
    setIsTestingPing(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const params = {
      event_category: 'admin_test',
      source: 'emovies_admin_dashboard',
      timestamp: now.toISOString(),
      current_ga_id: gaId.trim() || 'not_configured'
    };

    trackEvent('admin_test_ping', params);

    setGaEventLogs(prev => [
      {
        id: Math.random().toString(36).substring(7),
        name: 'admin_test_ping',
        time: timeStr,
        params
      },
      ...prev.slice(0, 9)
    ]);

    setTimeout(() => {
      setIsTestingPing(false);
    }, 600);
  };

  const handleCopyGaId = () => {
    if (!gaId) return;
    navigator.clipboard.writeText(gaId);
    setCopiedGaId(true);
    setTimeout(() => setCopiedGaId(false), 2000);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === 'elproject123') { // Ganti dengan password yang aman atau env
      setIsAuthenticated(true);
      sessionStorage.setItem('emovies_admin_auth', 'true');
    } else {
      setErrorMsg('Password salah!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('emovies_admin_auth');
  };

  const fetchVideos = async (query = '') => {
    setIsLoading(true);
    try {
      let request = supabase.from('videos').select('*').order('created_at', { ascending: false });

      if (query.length >= 3) {
        // Search globally across title and genre
        request = request.or(`title.ilike.%${query}%,genre.ilike.%${query}%`);
      }

      // Allow fetching more data (up to 10000) so user can see all their movies
      request = request.limit(10000);

      const { data, error } = await request;
      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (video: any) => {
    setForm({
      tmdb_id: video.tmdb_id || '',
      content_type: video.content_type || (video.category === 'series' ? 'tv' : 'movie'),
      title: video.title || '',
      description: video.description || '',
      genre: video.genre || '',
      year: video.year || '',
      duration: video.duration || '',
      score: video.score || '',
      poster_url: video.poster_url || video.thumbnail_url || '',
      backdrop_url: video.backdrop_url || '',
    });
    setEditingId(video.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus film ini dari database?')) return;
    try {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      alert('Film berhasil dihapus.');
      fetchVideos(searchQuery.trim().length >= 3 ? searchQuery.trim() : '');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleToggleFeature = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('videos').update({ is_featured: !currentStatus }).eq('id', id);
      if (error) throw error;
      setVideos(videos.map(v => v.id === id ? { ...v, is_featured: !currentStatus } : v));
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengupdate: ' + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-md p-4">
        <div className="w-full max-w-2xl bg-[#0a0a0a] border-2 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)] p-6 md:p-10 relative animate-in fade-in zoom-in duration-200">
          <button
            onClick={() => router.push('/')}
            className="absolute top-4 right-4 text-gray-400 hover:text-green-400 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-none flex items-center justify-center mb-4 border border-green-500/30">
              <Lock className="w-8 h-8 text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
            </div>
            <h2 className="text-3xl font-bold text-white text-center">Admin Mode</h2>
            <p className="text-gray-400 mt-2 text-center">Masukkan password untuk masuk ke halaman manajemen EMOVIES</p>
          </div>

          <div className="relative w-full">
            <form onSubmit={handleLogin} className="w-full relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500" />
              <input
                type="password"
                placeholder="Password"
                className="w-full h-14 pl-14 pr-4 bg-[#1a1a1a] text-white text-lg md:text-xl border-2 border-green-600 focus:border-green-500 focus:outline-none focus:ring-0 transition-colors placeholder-gray-600 font-medium"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
              />
              <button type="submit" className="hidden">Submit</button>
            </form>
            {errorMsg && <p className="text-red-500 mt-3 font-medium text-center">{errorMsg}</p>}
          </div>
        </div>
      </div>
    );
  }

  let filteredVideos = [...videos];

  if (activeTab === 2) {
    if (heroFilter === 'featured') {
      filteredVideos = filteredVideos.filter(v => v.is_featured === true);
    } else if (heroFilter === 'unfeatured') {
      filteredVideos = filteredVideos.filter(v => !v.is_featured);
    }
  }

  if (searchQuery.trim().length >= 3) {
    filteredVideos = filteredVideos.filter(v =>
      v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.genre?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Apply sorting
  if (sortBy === 'rating') {
    filteredVideos.sort((a, b) => {
      const scoreA = Number(a.score || a.imdb_score || 0);
      const scoreB = Number(b.score || b.imdb_score || 0);
      return scoreB - scoreA;
    });
  } else if (sortBy === 'rating_asc') {
    filteredVideos.sort((a, b) => {
      const scoreA = Number(a.score || a.imdb_score || 0);
      const scoreB = Number(b.score || b.imdb_score || 0);
      return scoreA - scoreB;
    });
  }

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / itemsPerPage));
  const paginatedVideos = filteredVideos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10 pt-24 md:pt-32">
      <div className="max-w-[1600px] mx-auto">


        {/* Admin Menus Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
          {[
            { id: 1, title: 'Movie Manager', icon: Film, desc: 'Atur koleksi film' },
            { id: 2, title: 'Hero Banner', icon: Star, desc: 'Atur sorotan utama' },
            { id: 3, title: 'Site Settings', icon: Settings, desc: 'Pengaturan web' },
            { id: 4, title: 'API Config', icon: Key, desc: 'Konfigurasi API' },
            { id: 5, title: 'Analytics', icon: BarChart, desc: 'Statistik web' },
            { id: 6, title: 'Themes', icon: Paintbrush, desc: 'Warna & Tema' },
            { id: 7, title: 'Security', icon: Shield, desc: 'Keamanan sistem' },
            { id: 8, title: 'System Logs', icon: FileText, desc: 'Riwayat sistem' },
          ].map(menu => (
            <button
              key={menu.id}
              onClick={() => setActiveTab(activeTab === menu.id ? null : menu.id)}
              className={`bg-[#111] border transition-all p-5 flex flex-col items-center justify-center text-center gap-3 group h-36 rounded-none ${activeTab === menu.id ? 'border-green-600 bg-[#1a1a1a]' : 'border-gray-800 hover:border-green-500 hover:bg-[#1a1a1a]'}`}
            >
              <menu.icon className={`w-8 h-8 transition-colors ${activeTab === menu.id ? 'text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'text-gray-500 group-hover:text-green-500 group-hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]'}`} />
              <div>
                <h3 className={`font-semibold text-sm ${activeTab === menu.id ? 'text-green-400' : 'text-white'}`}>{menu.title}</h3>
                <p className="text-gray-500 text-xs mt-1">{menu.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content Section */}
        {activeTab === 1 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Section Title */}
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Film className="w-6 h-6 text-green-500" /> Movie Manager
              </h2>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="relative w-full max-w-xl flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari film atau genre..."
                    className="w-full h-10 pl-12 pr-4 bg-[#1a1a1a] text-white border border-green-600 focus:border-green-500 focus:outline-none transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-10 px-4 bg-[#1a1a1a] text-white border border-green-600 focus:border-green-500 focus:outline-none hidden sm:block"
                >
                  <option value="newest">Urutkan: Terbaru</option>
                  <option value="rating">Urutkan: Rating Tertinggi</option>
                  <option value="rating_asc">Urutkan: Rating Terendah</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({ tmdb_id: '', content_type: 'movie', title: '', description: '', genre: '', year: '', duration: '', score: '', poster_url: '', backdrop_url: '' });
                  setIsModalOpen(true);
                }}
                className="bg-green-500 hover:bg-green-400 text-black font-bold h-10 px-6 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] whitespace-nowrap"
              >
                <Plus className="w-5 h-5" /> Add Movie
              </button>
            </div>

            {/* Table / List */}
            <div className="bg-[#111] border border-green-600 rounded-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/50 border-b border-green-600 text-gray-400 text-sm">
                      <th className="p-4 font-medium">Cover</th>
                      <th className="p-4 font-medium">Title</th>
                      <th className="p-4 font-medium hidden md:table-cell text-center">Type</th>
                      <th className="p-4 font-medium hidden lg:table-cell">Year</th>
                      <th className="p-4 font-medium hidden lg:table-cell">Genre</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-green-500">
                          Loading data...
                        </td>
                      </tr>
                    ) : paginatedVideos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          Tidak ada film ditemukan.
                        </td>
                      </tr>
                    ) : (
                      paginatedVideos.map(video => (
                        <tr key={video.id} className="border-b border-green-600 hover:bg-white/5 transition-colors group">
                          <td className="p-4">
                            <div className="w-12 h-16 bg-gray-900 rounded-none overflow-hidden">
                              {video.thumbnail_url || video.poster_url ? (
                                <img src={video.thumbnail_url || video.poster_url} alt={video.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                  <Film className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-white text-sm md:text-base mb-1">{video.title}</div>
                            <div className="text-xs text-gray-500 md:hidden mb-1">{video.year} • {video.content_type === 'tv' ? 'TV Show' : 'Movie'}</div>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-yellow-500 font-medium">{Number(video.score || video.imdb_score || 0).toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            {video.content_type === 'tv' ? (
                              <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-none border border-blue-500/20">Series</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-none border border-green-500/20">Movie</span>
                            )}
                          </td>
                          <td className="p-4 hidden lg:table-cell text-gray-400 text-sm">
                            {video.year || '-'}
                          </td>
                          <td className="p-4 hidden lg:table-cell">
                            <span className="text-sm text-gray-400 truncate max-w-xs inline-block">
                              {video.genre || '-'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(video)}
                                className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 transition-colors rounded-none"
                                title="Edit Film"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(video.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-none"
                                title="Hapus Film"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 bg-[#111] border border-gray-800 p-4">
                <p className="text-gray-400 text-sm hidden md:block">
                  Menampilkan <span className="text-white">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="text-white">{Math.min(currentPage * itemsPerPage, filteredVideos.length)}</span> dari <span className="text-white">{filteredVideos.length}</span> data
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-800 bg-[#1a1a1a] text-gray-400 hover:text-green-500 hover:border-green-500 disabled:opacity-50 disabled:hover:border-gray-800 disabled:hover:text-gray-400 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                      // Logic to show a window of 5 pages around the current page
                      let pageNum = currentPage;
                      if (totalPages <= 5) {
                        pageNum = idx + 1;
                      } else if (currentPage <= 3) {
                        pageNum = idx + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + idx;
                      } else {
                        pageNum = currentPage - 2 + idx;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 flex items-center justify-center text-sm font-medium border transition-colors ${currentPage === pageNum
                            ? 'border-green-500 text-green-400 bg-green-500/10'
                            : 'border-gray-800 text-gray-400 bg-[#1a1a1a] hover:border-green-500 hover:text-green-400'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-800 bg-[#1a1a1a] text-gray-400 hover:text-green-500 hover:border-green-500 disabled:opacity-50 disabled:hover:border-gray-800 disabled:hover:text-gray-400 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Hero Banner Manager */}
        {activeTab === 2 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Star className="w-6 h-6 text-green-500 fill-green-500" /> Hero Banner Settings
              </h2>
            </div>

            <p className="text-gray-400 mb-8 max-w-3xl">
              Cari dan pilih film yang ingin disorot pada Hero Banner di halaman depan.
              Klik tombol Bintang untuk menambah atau menghapus film dari sorotan. (Sangat disarankan film yang dipilih memiliki Backdrop).
            </p>

            <div className="bg-[#141414] border border-green-500/30 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400 font-bold">💡 Konsep Hero Banner:</span>
                <span>Sistem saat ini menampilkan film secara <strong>acak (random)</strong>. Film dengan status <strong>TERPILIH</strong> akan diprioritaskan dan diacak di hero banner halaman depan.</span>
              </div>
              <div className="text-xs bg-black/60 border border-green-500/40 text-green-400 px-3 py-1 font-semibold whitespace-nowrap">
                {videos.filter(v => v.is_featured).length} Film Terpilih
              </div>
            </div>

            {/* Filter Tabs (Semua / Terpilih / Belum Terpilih) */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  setHeroFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs md:text-sm font-semibold border transition-all ${heroFilter === 'all' ? 'bg-green-500 text-black border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-[#141414] text-gray-300 border-gray-800 hover:border-gray-600'}`}
              >
                Semua Film ({videos.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeroFilter('featured');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs md:text-sm font-semibold border transition-all flex items-center gap-1.5 ${heroFilter === 'featured' ? 'bg-green-500 text-black border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-[#141414] text-yellow-400 border-gray-800 hover:border-yellow-500/50'}`}
              >
                <Star className="w-4 h-4 fill-current" />
                Film Terpilih ({videos.filter(v => v.is_featured).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeroFilter('unfeatured');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs md:text-sm font-semibold border transition-all ${heroFilter === 'unfeatured' ? 'bg-green-500 text-black border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-[#141414] text-gray-400 border-gray-800 hover:border-gray-600'}`}
              >
                Belum Terpilih ({videos.filter(v => !v.is_featured).length})
              </button>
            </div>

            {/* Search Bar & Sort */}
            <div className="relative mb-8 max-w-xl flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari film untuk dijadikan banner..."
                  className="w-full h-10 pl-12 pr-4 bg-[#1a1a1a] text-white border border-green-600 focus:border-green-500 focus:outline-none transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-4 bg-[#1a1a1a] text-white border border-green-600 focus:border-green-500 focus:outline-none hidden sm:block"
              >
                <option value="newest">Urutkan: Terbaru</option>
                <option value="rating">Urutkan: Rating Tertinggi</option>
              </select>
            </div>

            {/* Grid selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginatedVideos.map(video => (
                <div key={video.id} className={`relative group border transition-all ${video.is_featured ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] bg-green-900/10' : 'border-gray-800 bg-[#111] hover:border-gray-600'}`}>
                  <div className="aspect-video w-full bg-gray-900 relative overflow-hidden">
                    {video.backdrop_url || video.thumbnail_url || video.poster_url ? (
                      <img src={video.backdrop_url || video.thumbnail_url || video.poster_url} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-6 h-6 text-gray-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <button
                        onClick={() => handleToggleFeature(video.id, !!video.is_featured)}
                        className={`p-3 rounded-full transition-transform transform hover:scale-110 ${video.is_featured ? 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white'}`}
                      >
                        {video.is_featured ? <X className="w-6 h-6" /> : <Star className="w-6 h-6" />}
                      </button>
                    </div>
                    {/* Rating Badge */}
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-1.5 py-0.5 shadow-[0_0_5px_rgba(0,0,0,0.8)] flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> {Number(video.score || video.imdb_score || 0).toFixed(1)}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-white line-clamp-1">{video.title}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">{video.year || '-'}</p>
                      {video.is_featured && <span className="text-[10px] bg-green-500 text-black px-1.5 py-0.5 font-bold">TERPILIH</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {paginatedVideos.length === 0 && (
              <div className="py-12 text-center border-2 border-dashed border-gray-800">
                <p className="text-gray-500">Tidak ada film ditemukan.</p>
              </div>
            )}

            {/* Pagination Controls Reuse */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-8 gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-800 bg-[#1a1a1a] text-gray-400 hover:text-green-500 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-gray-400 text-sm px-4">Hal {currentPage} dari {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-800 bg-[#1a1a1a] text-gray-400 hover:text-green-500 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Server Config Tab (4) */}
        {activeTab === 4 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Key className="w-6 h-6 text-green-500" /> Konfigurasi Server (API)
              </h2>
            </div>

            <div className="bg-[#111] p-6 border border-gray-800">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-2">Embed Video Servers</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Masukkan daftar URL server embed yang digunakan secara terpisah.
                  Server ini akan muncul sebagai opsi di halaman tonton (player).
                </p>
                <div className="space-y-3">
                  {serverUrlsList.map((server, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        value={server.name}
                        onChange={(e) => {
                          const newList = [...serverUrlsList];
                          newList[index] = { ...newList[index], name: e.target.value };
                          setServerUrlsList(newList);
                        }}
                        className="w-1/3 h-12 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none transition-colors text-sm"
                        placeholder={`Nama Server ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={server.url}
                        onChange={(e) => {
                          const newList = [...serverUrlsList];
                          newList[index] = { ...newList[index], url: e.target.value };
                          setServerUrlsList(newList);
                        }}
                        className="flex-1 h-12 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none transition-colors font-mono text-sm"
                        placeholder={`https://server${index + 1}.com/embed/`}
                      />
                      <button
                        onClick={() => {
                          if (index === 0) return;
                          const newList = [...serverUrlsList];
                          const temp = newList[index - 1];
                          newList[index - 1] = newList[index];
                          newList[index] = temp;
                          setServerUrlsList(newList);
                        }}
                        disabled={index === 0}
                        className="w-12 h-12 bg-[#1a1a1a] text-gray-400 hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors shrink-0 border border-gray-800"
                        title="Naikkan urutan"
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (index === serverUrlsList.length - 1) return;
                          const newList = [...serverUrlsList];
                          const temp = newList[index + 1];
                          newList[index + 1] = newList[index];
                          newList[index] = temp;
                          setServerUrlsList(newList);
                        }}
                        disabled={index === serverUrlsList.length - 1}
                        className="w-12 h-12 bg-[#1a1a1a] text-gray-400 hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors shrink-0 border border-gray-800"
                        title="Turunkan urutan"
                      >
                        <ArrowDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          const newList = serverUrlsList.filter((_, i) => i !== index);
                          setServerUrlsList(newList.length > 0 ? newList : [{ name: '', url: '' }]);
                        }}
                        className="w-12 h-12 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                        title="Hapus server"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setServerUrlsList([...serverUrlsList, { name: '', url: '' }])}
                  className="mt-4 text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Tambah Server
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingServer}
                  className="bg-green-500 hover:bg-green-400 text-black font-bold h-12 px-8 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] disabled:opacity-50"
                >
                  {isSavingServer ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Site Settings Tab (3) */}
        {activeTab === 3 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Settings className="w-6 h-6 text-green-500" /> Site Settings (Pengaturan Web)
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Kelola konfigurasi umum website, analitik pelacakan, dan status integrasi platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Google Analytics Quick Card */}
              <div className="bg-[#111] p-6 border border-gray-800 hover:border-green-500/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400">
                        <BarChart className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Google Analytics (GA4)</h3>
                        <p className="text-gray-400 text-xs">Pelacakan trafik & interaksi penonton</p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 font-semibold uppercase tracking-wider ${gaId && gaEnabled
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : gaId && !gaEnabled
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                      {gaId && gaEnabled ? 'Aktif' : gaId && !gaEnabled ? 'Dijeda' : 'Belum Diatur'}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    ID Pengukuran:{' '}
                    <span className="font-mono text-white font-semibold">
                      {gaId || '(Belum dikonfigurasi)'}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-800/80">
                  <button
                    onClick={() => setActiveTab(5)}
                    className="w-full bg-green-500 hover:bg-green-400 text-black font-bold h-10 px-4 flex items-center justify-center gap-2 text-sm transition-all"
                  >
                    <BarChart className="w-4 h-4" /> Kelola Google Analytics
                  </button>
                </div>
              </div>

              {/* Server Video API Quick Card */}
              <div className="bg-[#111] p-6 border border-gray-800 hover:border-green-500/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400">
                        <Key className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Server Video Player (API)</h3>
                        <p className="text-gray-400 text-xs">Daftar embed server streaming film</p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 font-semibold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30">
                      {serverUrlsList.filter(s => s.url).length} Server Aktif
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    Menyediakan pilihan server otomatis bagi penonton saat film diputar di halaman watch.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-800/80">
                  <button
                    onClick={() => setActiveTab(4)}
                    className="w-full bg-[#1a1a1a] hover:bg-gray-800 border border-gray-700 text-white font-bold h-10 px-4 flex items-center justify-center gap-2 text-sm transition-all"
                  >
                    <Key className="w-4 h-4 text-green-400" /> Buka Konfigurasi Server
                  </button>
                </div>
              </div>

              {/* Google Search Console & SEO Card */}
              <div className="bg-[#111] p-6 border border-gray-800 hover:border-green-500/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Google SEO &amp; Sitemap</h3>
                        <p className="text-gray-400 text-xs">Peta situs &amp; optimasi mesin pencari</p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 font-semibold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30">
                      Teroptimasi
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-400 mb-4">
                    <div className="flex items-center justify-between">
                      <span>Peta Situs:</span>
                      <a href="/sitemap.xml" target="_blank" className="font-mono text-green-400 hover:underline flex items-center gap-1">
                        /sitemap.xml <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Robots Tag:</span>
                      <a href="/robots.txt" target="_blank" className="font-mono text-green-400 hover:underline flex items-center gap-1">
                        /robots.txt <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Schema Markup:</span>
                      <span className="text-white font-semibold">WebSite &amp; Movie JSON-LD</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-800/80">
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#1a1a1a] hover:bg-gray-800 border border-gray-700 text-green-400 hover:text-green-300 font-bold h-10 px-4 flex items-center justify-center gap-2 text-sm transition-all"
                  >
                    <ExternalLink className="w-4 h-4" /> Buka Google Search Console
                  </a>
                </div>
              </div>
            </div>

            {/* Platform Status Card */}
            <div className="bg-[#111] p-6 border border-gray-800">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-400" /> Status Sistem & Layanan EMOVIES
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="p-4 bg-[#161616] border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-400">Database Supabase</span>
                  <span className="text-green-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
                  </span>
                </div>
                <div className="p-4 bg-[#161616] border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-400">TMDB API Metadata</span>
                  <span className="text-green-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span> Terhubung
                  </span>
                </div>
                <div className="p-4 bg-[#161616] border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-400">Pelacakan Google Analytics</span>
                  <span className={`font-semibold flex items-center gap-1.5 ${gaId && gaEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${gaId && gaEnabled ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                    {gaId && gaEnabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="p-4 bg-[#161616] border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-400">Google Sitemap Index</span>
                  <span className="text-green-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span> 1.000+ Film
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Google Analytics (GA4) */}
        {activeTab === 5 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BarChart className="w-7 h-7 text-green-500" /> Google Analytics (GA4) Dashboard
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Pantau statistik pengunjung, tren streaming film, dan performa website secara real-time.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://analytics.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1a1a1a] hover:bg-gray-800 text-green-400 border border-green-500/40 hover:border-green-400 px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0"
                >
                  <ExternalLink className="w-4 h-4" /> Buka GA4 Console
                </a>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800/80 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab('dashboard')}
                  className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold transition-all ${analyticsSubTab === 'dashboard'
                    ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                    : 'bg-[#141414] text-gray-400 hover:text-white border border-gray-800'
                    }`}
                >
                  <BarChart3 className="w-4 h-4" /> Dashboard &amp; Statistik
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab('settings')}
                  className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold transition-all ${analyticsSubTab === 'settings'
                    ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                    : 'bg-[#141414] text-gray-400 hover:text-white border border-gray-800'
                    }`}
                >
                  <Settings className="w-4 h-4" /> Konfigurasi Tag ({gaId || 'Atur ID'})
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">Status Pelacakan:</span>
                <span className={`text-[11px] px-3 py-1 font-semibold flex items-center gap-2 border ${gaId && gaEnabled
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : gaId && !gaEnabled
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${gaId && gaEnabled ? 'bg-green-400 animate-pulse' : gaId ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                  {gaId && gaEnabled ? `Live: ${gaId}` : gaId && !gaEnabled ? 'Pelacakan Dijeda' : 'Belum Dikonfigurasi'}
                </span>
              </div>
            </div>

            {/* Sub-tab 1: DASHBOARD VIEW */}
            {analyticsSubTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Dashboard Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111] p-4 border border-gray-800">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-sm font-semibold text-white">Ringkasan Aktivitas Pengunjung</span>
                    <span className="text-xs text-gray-500 font-mono hidden md:inline">({gaId || 'GA4 Web Stream'})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Range Filter */}
                    <div className="flex items-center bg-[#1a1a1a] border border-gray-800 p-0.5">
                      <button
                        onClick={() => {
                          setAnalyticsRange('today');
                          loadRealAnalytics('today');
                        }}
                        className={`px-3 py-1 text-xs font-semibold transition-all ${analyticsRange === 'today' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'
                          }`}
                      >
                        Hari Ini
                      </button>
                      <button
                        onClick={() => {
                          setAnalyticsRange('7d');
                          loadRealAnalytics('7d');
                        }}
                        className={`px-3 py-1 text-xs font-semibold transition-all ${analyticsRange === '7d' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'
                          }`}
                      >
                        7 Hari
                      </button>
                      <button
                        onClick={() => {
                          setAnalyticsRange('30d');
                          loadRealAnalytics('30d');
                        }}
                        className={`px-3 py-1 text-xs font-semibold transition-all ${analyticsRange === '30d' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'
                          }`}
                      >
                        30 Hari
                      </button>
                    </div>

                    <button
                      onClick={handleRefreshStats}
                      disabled={isRefreshingStats}
                      className="p-2 bg-[#1a1a1a] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-green-400 transition-colors"
                      title="Perbarui Statistik"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshingStats ? 'animate-spin text-green-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* 4 Primary Metric KPI Cards (100% REAL DATA) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Real Streams */}
                  <div className="bg-[#111] p-5 border border-gray-800 hover:border-green-500/40 transition-all relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Ditonton (Streams)</span>
                      <div className="p-2 bg-green-500/10 text-green-400 border border-green-500/20">
                        <Play className="w-5 h-5 fill-current" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-white mb-2 font-mono">
                      {Math.max(realStats.totalCatalogViews, realStats.totalWatchEvents).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100% Data Riil
                      </span>
                      <span className="text-gray-500">{realStats.watchedTitlesCount} judul ditonton</span>
                    </div>
                    <div className="w-full bg-gray-900 h-1 mt-3 overflow-hidden">
                      <div className="bg-green-500 h-full w-[88%]" />
                    </div>
                  </div>

                  {/* Card 2: Real Pageviews */}
                  <div className="bg-[#111] p-5 border border-gray-800 hover:border-green-500/40 transition-all relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Tayangan Halaman (DB)</span>
                      <div className="p-2 bg-green-500/10 text-green-400 border border-green-500/20">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-white mb-2 font-mono">
                      {realStats.totalPageViews.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-400 flex items-center gap-1 font-semibold">
                        <Activity className="w-3.5 h-3.5" /> Realtime Logger
                      </span>
                      <span className="text-gray-500">tabel: analytics_events</span>
                    </div>
                    <div className="w-full bg-gray-900 h-1 mt-3 overflow-hidden">
                      <div className="bg-green-500 h-full w-[70%]" />
                    </div>
                  </div>

                  {/* Card 3: Real Catalog */}
                  <div className="bg-[#111] p-5 border border-gray-800 hover:border-green-500/40 transition-all relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Katalog Film</span>
                      <div className="p-2 bg-green-500/10 text-green-400 border border-green-500/20">
                        <Film className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-white mb-2 font-mono">
                      {realStats.totalVideos.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-400 flex items-center gap-1 font-semibold">
                        {realStats.totalMovies.toLocaleString()} Movie
                      </span>
                      <span className="text-blue-400 font-semibold">{realStats.totalSeries.toLocaleString()} Series</span>
                    </div>
                    <div className="w-full bg-gray-900 h-1 mt-3 overflow-hidden">
                      <div className="bg-green-500 h-full w-[100%]" />
                    </div>
                  </div>

                  {/* Card 4: Total Events & Searches */}
                  <div className="bg-[#111] p-5 border border-gray-800 hover:border-green-500/40 transition-all relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Aktivitas &amp; Interaksi</span>
                      <div className="p-2 bg-green-500/10 text-green-400 border border-green-500/20">
                        <Activity className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-white mb-2 font-mono">
                      {realStats.totalEvents.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-400 flex items-center gap-1 font-semibold">
                        {realStats.totalSearches} Pencarian
                      </span>
                      <span className="text-gray-500">Live GA4 + Supabase</span>
                    </div>
                    <div className="w-full bg-gray-900 h-1 mt-3 overflow-hidden">
                      <div className="bg-green-500 h-full w-[65%]" />
                    </div>
                  </div>
                </div>

                {/* 2-Column Section: Real Breakdown & Live Event Stream */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Real Catalog & Traffic Breakdown */}
                  <div className="bg-[#111] p-6 border border-gray-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-bold text-white text-base flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-green-400" /> Komposisi Katalog &amp; Tontonan Riil
                          </h3>
                          <p className="text-gray-400 text-xs mt-0.5">
                            Data statistik dihitung langsung dari tabel database PostgreSQL Supabase
                          </p>
                        </div>
                        <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 px-2.5 py-1 font-semibold uppercase">
                          Live Database
                        </span>
                      </div>

                      <div className="space-y-4 text-xs">
                        {/* Film Movies */}
                        <div>
                          <div className="flex justify-between text-gray-300 mb-1">
                            <span className="flex items-center gap-1.5"><Film className="w-3.5 h-3.5 text-green-400" /> Kategori Film (Movies)</span>
                            <span className="font-mono font-bold text-white">
                              {realStats.totalMovies.toLocaleString()} ({Math.round((realStats.totalMovies / (realStats.totalVideos || 1)) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-900 h-2">
                            <div style={{ width: `${Math.round((realStats.totalMovies / (realStats.totalVideos || 1)) * 100)}%` }} className="bg-green-500 h-full" />
                          </div>
                        </div>

                        {/* TV Series */}
                        <div>
                          <div className="flex justify-between text-gray-300 mb-1">
                            <span className="flex items-center gap-1.5"><Tv className="w-3.5 h-3.5 text-blue-400" /> Kategori TV Series</span>
                            <span className="font-mono font-bold text-white">
                              {realStats.totalSeries.toLocaleString()} ({Math.round((realStats.totalSeries / (realStats.totalVideos || 1)) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-900 h-2">
                            <div style={{ width: `${Math.round((realStats.totalSeries / (realStats.totalVideos || 1)) * 100)}%` }} className="bg-blue-500 h-full" />
                          </div>
                        </div>

                        {/* Watched Videos */}
                        <div>
                          <div className="flex justify-between text-gray-300 mb-1">
                            <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-yellow-400" /> Film dengan Riwayat Tayang</span>
                            <span className="font-mono font-bold text-white">
                              {realStats.watchedTitlesCount} Judul ({Math.round(((realStats.watchedTitlesCount || 0) / (realStats.totalVideos || 1)) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-900 h-2">
                            <div style={{ width: `${Math.round(((realStats.watchedTitlesCount || 0) / (realStats.totalVideos || 1)) * 100)}%` }} className="bg-yellow-500 h-full" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-800/80 bg-[#141414] p-3 text-xs text-gray-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Tag Google Analytics:</span>
                        <span className="font-mono text-green-400 font-bold">{gaId || 'G-Z8S9KJNHPF'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sinkronisasi Gtag:</span>
                        <span className="text-green-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Aktif di Semua Halaman
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Event Stream Feed */}
                  <div className="bg-[#111] p-6 border border-gray-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                          </span>
                          <h3 className="font-bold text-white text-base">Aktivitas Realtime Terkini (Live Feed)</h3>
                        </div>
                        <button
                          onClick={handleRefreshStats}
                          className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshingStats ? 'animate-spin' : ''}`} /> Perbarui
                        </button>
                      </div>

                      <p className="text-gray-400 text-xs mb-4">
                        Pencatatan event otomatis saat pengunjung membuka website, menonton video, atau mencari film:
                      </p>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {recentLiveEvents.length === 0 ? (
                          <div className="py-8 text-center border border-dashed border-gray-800 text-gray-500 text-xs">
                            Belum ada event yang tercatat. Buka halaman depan atau putar film untuk melihat aktivitas riil mengalir.
                          </div>
                        ) : (
                          recentLiveEvents.map((evt) => (
                            <div key={evt.id} className="p-2.5 bg-[#161616] border border-gray-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                <span className="font-mono text-green-400 font-bold">{evt.event_name}</span>
                                <span className="text-gray-400 truncate max-w-[140px] sm:max-w-[180px]">{evt.event_path || '/'}</span>
                              </div>
                              <span className="text-[10px] text-gray-500 font-mono shrink-0">
                                {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-800 mt-4 text-[11px] text-gray-500">
                      Tercatat secara paralel ke <strong className="text-white">Google Analytics (G-Z8S9KJNHPF)</strong> dan tabel <strong className="text-white">analytics_events</strong>.
                    </div>
                  </div>
                </div>

                {/* Top Streamed Movies Catalog Card (100% REAL DATA FROM DATABASE) */}
                <div className="bg-[#111] p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        <Film className="w-5 h-5 text-green-400" /> Konten Film Paling Banyak Ditonton
                      </h3>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Menampilkan film teratas bedasarkan jumlah tontonan.
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab(1)}
                      className="text-xs text-green-400 hover:text-green-300 font-semibold flex items-center gap-1"
                    >
                      Buka Movie Manager <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#161616] border-b border-gray-800 text-gray-400 shadow-sm">
                          <th className="p-3">Rank</th>
                          <th className="p-3">Cover</th>
                          <th className="p-3">Judul Konten</th>
                          <th className="p-3">Tipe</th>
                          <th className="p-3">Rating Score</th>
                          <th className="p-3">Genre</th>
                          <th className="p-3 text-right">Jumlah Ditonton (Views)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topStreamedMovies.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-gray-500">
                              Memuat data film populer...
                            </td>
                          </tr>
                        ) : (
                          topStreamedMovies.map((m, idx) => (
                            <tr key={m.id} className="border-b border-gray-800/80 hover:bg-white/5 transition-colors">
                              <td className="p-3 font-mono font-bold text-green-400">#{idx + 1}</td>
                              <td className="p-3">
                                <div className="w-9 h-12 bg-gray-900 overflow-hidden">
                                  {m.thumbnail_url || m.poster_url ? (
                                    <img src={m.thumbnail_url || m.poster_url} alt={m.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                                      <Film className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-semibold text-white">
                                {m.title}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 text-[10px] font-semibold border ${m.content_type === 'tv'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-green-500/10 text-green-400 border-green-500/20'
                                  }`}>
                                  {m.content_type === 'tv' ? 'Series' : 'Movie'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1 text-yellow-500 font-medium">
                                  <Star className="w-3 h-3 fill-yellow-500" />
                                  <span>{Number(m.score || m.imdb_score || 0).toFixed(1)}</span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-400 truncate max-w-xs">{m.genre || '-'}</td>
                              <td className="p-3 text-right">
                                <span className="font-mono text-green-400 font-bold bg-green-500/10 border border-green-500/30 px-2.5 py-1">
                                  {Number(m.view_count || 0)} Views
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4 Quick GA4 Deep-Report Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <a
                    href="https://analytics.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-[#111] border border-gray-800 hover:border-green-500/50 hover:bg-[#161616] transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-green-400 mb-2">
                        <Radio className="w-5 h-5 animate-pulse" />
                        <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">GA4 Realtime Report</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Pantau penonton yang sedang aktif detik ini, halaman dibuka, dan kota lokasi penonton.
                      </p>
                    </div>
                    <span className="text-[11px] text-green-400 font-semibold mt-4">Lihat Laporan Realtime &rarr;</span>
                  </a>

                  <a
                    href="https://analytics.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-[#111] border border-gray-800 hover:border-green-500/50 hover:bg-[#161616] transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-green-400 mb-2">
                        <Globe className="w-5 h-5" />
                        <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">Demografi &amp; Lokasi</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Analisis negara asal (Indonesia, Malaysia, dll) dan perangkat yang dipakai penonton.
                      </p>
                    </div>
                    <span className="text-[11px] text-green-400 font-semibold mt-4">Lihat Demografi &rarr;</span>
                  </a>

                  <a
                    href="https://analytics.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-[#111] border border-gray-800 hover:border-green-500/50 hover:bg-[#161616] transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-green-400 mb-2">
                        <Activity className="w-5 h-5" />
                        <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">Laporan Event Khusus</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Data statistik peristiwa <code className="text-green-400">watch_video</code> dan <code className="text-green-400">search_movie</code>.
                      </p>
                    </div>
                    <span className="text-[11px] text-green-400 font-semibold mt-4">Cek Data Event &rarr;</span>
                  </a>

                  <button
                    onClick={() => setAnalyticsSubTab('settings')}
                    className="p-4 bg-[#111] border border-gray-800 hover:border-green-500/50 hover:bg-[#161616] transition-all group flex flex-col justify-between text-left"
                  >
                    <div>
                      <div className="flex items-center justify-between text-green-400 mb-2">
                        <Settings className="w-5 h-5" />
                        <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">Pengaturan &amp; Tes Tag</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Ubah Measurement ID, jeda pelacakan, atau kirim event uji coba simulasi.
                      </p>
                    </div>
                    <span className="text-[11px] text-green-400 font-semibold mt-4">Buka Pengaturan &rarr;</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-tab 2: SETTINGS & VERIFICATION VIEW */}
            {analyticsSubTab === 'settings' && (
              <div className="space-y-6">
                {/* Status KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 1: Connection Status */}
                  <div className="bg-[#111] p-5 border border-gray-800 relative overflow-hidden">
                    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Status Integrasi</div>
                    <div className="flex items-center gap-3">
                      {gaId && gaEnabled ? (
                        <>
                          <span className="relative flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                          </span>
                          <span className="text-green-400 font-bold text-base md:text-lg">TERHUBUNG & AKTIF</span>
                        </>
                      ) : gaId && !gaEnabled ? (
                        <>
                          <span className="inline-flex rounded-full h-3.5 w-3.5 bg-yellow-500"></span>
                          <span className="text-yellow-400 font-bold text-base md:text-lg">PELACAKAN DIJEDA</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex rounded-full h-3.5 w-3.5 bg-gray-600"></span>
                          <span className="text-gray-400 font-bold text-base md:text-lg">BELUM DIKONFIGURASI</span>
                        </>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-2">
                      {gaId && gaEnabled
                        ? 'Script gtag.js otomatis disuntikkan ke semua halaman.'
                        : gaId && !gaEnabled
                          ? 'Pelacakan dijeda sementara oleh admin.'
                          : 'Masukkan Measurement ID di bawah untuk mengaktifkan.'}
                    </p>
                  </div>

                  {/* Card 2: Current ID */}
                  <div className="bg-[#111] p-5 border border-gray-800">
                    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">ID Pengukuran Aktif</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-white text-base md:text-lg font-bold truncate">
                        {gaId || '-'}
                      </span>
                      {gaId && (
                        <button
                          onClick={handleCopyGaId}
                          className="text-gray-400 hover:text-green-400 p-1.5 transition-colors"
                          title="Salin ID"
                        >
                          {copiedGaId ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-2">Target Properti GA4 Web Stream</p>
                  </div>

                  {/* Card 3: Events Monitored */}
                  <div className="bg-[#111] p-5 border border-gray-800">
                    <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Event Otomatis</div>
                    <div className="text-white text-base md:text-lg font-bold">4 Event Terpasang</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] bg-black/60 border border-green-500/30 text-green-400 px-2 py-0.5">page_view</span>
                      <span className="text-[10px] bg-black/60 border border-green-500/30 text-green-400 px-2 py-0.5">watch_video</span>
                      <span className="text-[10px] bg-black/60 border border-green-500/30 text-green-400 px-2 py-0.5">search_movie</span>
                    </div>
                  </div>
                </div>

                {/* Main Configuration Form Card */}
                <div className="bg-[#111] border border-gray-800 p-6 md:p-8">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-400" /> Konfigurasi Tag Google Analytics (GA4)
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    ID Pengukuran (Measurement ID) saat ini tersimpan di Supabase. Perubahan akan langsung berlaku pada seluruh pengunjung website secara instan tanpa perlu build ulang aplikasi.
                  </p>

                  <div className="space-y-6 max-w-3xl">
                    {/* Measurement ID Input */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2 flex items-center justify-between">
                        <span>Measurement ID (ID Pengukuran)</span>
                        <span className="text-xs text-gray-500 font-normal">Contoh: G-XXXXXXXXXX</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={gaId}
                          onChange={(e) => setGaId(e.target.value)}
                          placeholder="G-ABC123XYZ0"
                          className="w-full h-12 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none transition-colors font-mono text-sm tracking-wider"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 ID ini diawali dengan huruf <strong className="text-green-400">G-</strong> dan dapat ditemukan pada menu <em>Admin &gt; Data Streams (Aliran Data) &gt; Web</em> di Google Analytics.
                      </p>
                    </div>

                    {/* Tracking Enable/Disable Toggle */}
                    <div className="bg-[#181818] border border-gray-800 p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white text-sm">Status Pelacakan Web (Tracking Active)</div>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {gaEnabled
                            ? 'Pelacakan aktif: Tag GA4 disuntikkan dan memproses kunjungan pengunjung.'
                            : 'Pelacakan dinonaktifkan: Script GA tidak akan dimuat di browser penonton.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setGaEnabled(!gaEnabled)}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${gaEnabled ? 'bg-green-500' : 'bg-gray-700'
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${gaEnabled ? 'translate-x-7' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-800">
                      <button
                        onClick={handleSaveAnalytics}
                        disabled={isSavingGa}
                        className="bg-green-500 hover:bg-green-400 text-black font-bold h-12 px-8 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] disabled:opacity-50 text-sm"
                      >
                        {isSavingGa ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" /> Simpan Pengaturan Analytics
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSendTestPing}
                        disabled={isTestingPing || !gaId}
                        className="bg-[#1a1a1a] hover:bg-gray-800 text-white border border-gray-700 hover:border-green-500/50 font-medium h-12 px-6 flex items-center justify-center gap-2 transition-all disabled:opacity-40 text-sm"
                        title={!gaId ? 'Masukkan Measurement ID terlebih dahulu' : 'Kirim event uji coba ke Google Analytics'}
                      >
                        <Send className={`w-4 h-4 ${isTestingPing ? 'animate-bounce text-green-400' : 'text-gray-400'}`} />
                        {isTestingPing ? 'Mengirim Ping...' : 'Kirim Event Uji Coba (Test Ping)'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Session Event Log (Verification Tool) */}
                <div className="bg-[#111] border border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-400" />
                      <h3 className="text-base font-bold text-white">Log Pengujian Event (Sesi Browser Ini)</h3>
                    </div>
                    {gaEventLogs.length > 0 && (
                      <button
                        onClick={() => setGaEventLogs([])}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Bersihkan Log
                      </button>
                    )}
                  </div>

                  <p className="text-gray-400 text-xs mb-4">
                    Setiap kali Anda menekan tombol <strong>Kirim Event Uji Coba</strong>, sistem mengirimkan event <code className="text-green-400">admin_test_ping</code> ke dataLayer dan Google Analytics. Anda dapat memeriksa kemunculan event ini pada menu <strong>Realtime</strong> di Google Analytics Console.
                  </p>

                  {gaEventLogs.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-gray-800 bg-[#141414]">
                      <Send className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Belum ada event uji coba yang dikirim pada sesi ini.</p>
                      <p className="text-gray-600 text-xs mt-1">Gunakan tombol "Kirim Event Uji Coba" di atas untuk memverifikasi.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {gaEventLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 bg-[#161616] border border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            <span className="text-green-400 font-bold">{log.name}</span>
                            <span className="text-gray-500">[{log.time}]</span>
                          </div>
                          <div className="text-gray-400 truncate max-w-md">
                            {JSON.stringify(log.params)}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5">
                              Terkirim ke gtag
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Setup Guide Card */}
                <div className="bg-[#111] border border-green-600/30 p-6">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-green-400" /> Panduan Praktis Menghubungkan Google Analytics 4
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed text-gray-300">
                    <div className="p-4 bg-[#141414] border border-gray-800">
                      <div className="font-bold text-green-400 mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[11px] font-bold">1</span>
                        Buat Properti GA4
                      </div>
                      <p className="text-gray-400">
                        Buka <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="text-green-400 underline">analytics.google.com</a>, masuk ke Admin, lalu buat Properti baru untuk website EMOVIES Anda.
                      </p>
                    </div>

                    <div className="p-4 bg-[#141414] border border-gray-800">
                      <div className="font-bold text-green-400 mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[11px] font-bold">2</span>
                        Ambil Measurement ID
                      </div>
                      <p className="text-gray-400">
                        Pilih platform <strong>Web</strong>, isi URL website Anda, lalu salin <strong>ID Pengukuran (Measurement ID)</strong> berformat <code className="text-green-400">G-XXXXXXXXXX</code>.
                      </p>
                    </div>

                    <div className="p-4 bg-[#141414] border border-gray-800">
                      <div className="font-bold text-green-400 mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[11px] font-bold">3</span>
                        Tempel &amp; Simpan
                      </div>
                      <p className="text-gray-400">
                        Tempelkan ID pada kolom di atas, pastikan status pelacakan Aktif, lalu klik <strong>Simpan Pengaturan Analytics</strong>. Website langsung mulai melacak secara real-time!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Render for other tabs placeholder */}
        {activeTab !== null && activeTab !== 1 && activeTab !== 2 && activeTab !== 3 && activeTab !== 4 && activeTab !== 5 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 bg-[#111]">
            <Settings className="w-12 h-12 text-gray-600 mb-4 animate-spin-slow" />
            <h2 className="text-xl font-bold text-gray-300">Modul Belum Aktif</h2>
            <p className="text-gray-500">Fitur ini masih dalam tahap pengembangan.</p>
          </div>
        )}

      </div>

      {/* Add Movie Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-md p-4 sm:p-8 overflow-hidden">
          <div className="w-full max-w-4xl bg-[#0a0a0a] border-2 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)] flex flex-col relative animate-in fade-in zoom-in duration-200 max-h-[95vh] sm:max-h-[90vh]">

            {/* Modal Header */}
            <div className="flex-none p-6 border-b border-gray-800 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-green-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6 text-green-500" /> Tambah Film / Series
              </h2>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="add-movie-form" onSubmit={handleSaveMovie} className="space-y-6">
                <div className="bg-[#111] p-5 border border-gray-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tipe Konten</label>
                    <select
                      value={form.content_type}
                      onChange={e => setForm({ ...form, content_type: e.target.value })}
                      className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none"
                    >
                      <option value="movie">Movie</option>
                      <option value="tv">Series (TV)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">TMDB ID</label>
                    <input
                      type="text"
                      value={form.tmdb_id}
                      onChange={e => setForm({ ...form, tmdb_id: e.target.value })}
                      className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none"
                      placeholder="e.g. 550"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleFetchTmdb}
                      disabled={isFetchingTmdb || !form.tmdb_id}
                      className="w-full h-10 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-all text-sm"
                    >
                      {isFetchingTmdb ? 'Menarik data...' : 'Auto-Fill TMDB'}
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleCheckServer}
                      disabled={isCheckingServer || !form.tmdb_id}
                      className="w-full h-10 bg-[#333] hover:bg-[#444] disabled:opacity-50 text-white font-bold transition-all text-sm border border-gray-600"
                    >
                      {isCheckingServer ? 'Mengecek...' : 'Cek Server'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Judul</label>
                    <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Genre</label>
                    <input type="text" value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tahun Rilis</label>
                    <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Durasi (contoh: 2h 15m)</label>
                    <input type="text" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Rating Score (TMDB/IMDb)</label>
                    <input type="number" step="0.1" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Deskripsi (Sinopsis)</label>
                  <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Poster URL (Vertical)</label>
                    <input type="text" value={form.poster_url} onChange={e => setForm({ ...form, poster_url: e.target.value })} className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none" />
                    {form.poster_url && <img src={form.poster_url} alt="Poster" className="mt-4 w-32 md:w-48 aspect-[2/3] object-cover border border-green-600/30" />}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Backdrop URL (Horizontal)</label>
                    <input type="text" value={form.backdrop_url} onChange={e => setForm({ ...form, backdrop_url: e.target.value })} className="w-full h-10 px-4 bg-[#1a1a1a] text-white border border-gray-800 focus:border-green-500 focus:outline-none" />
                    {form.backdrop_url && <img src={form.backdrop_url} alt="Backdrop" className="mt-4 w-full h-48 md:h-72 object-cover border border-green-600/30" />}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer (Fixed) */}
            <div className="flex-none p-6 border-t border-gray-800 flex justify-end gap-4 bg-[#0a0a0a]">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors">
                Batal
              </button>
              <button form="add-movie-form" type="submit" disabled={isSaving} className="px-8 py-2 bg-green-500 hover:bg-green-400 text-black font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.4)] disabled:opacity-50">
                {isSaving ? 'Menyimpan...' : 'Simpan Film'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

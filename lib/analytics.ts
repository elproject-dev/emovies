// Helper utilities for Google Analytics (GA4) & Database Analytics Tracking
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Log page view to Google Analytics and Supabase
 */
export const pageview = (url: string, title?: string) => {
  const pageTitle = title || (typeof document !== 'undefined' ? document.title : '');

  // 1. Send to Google Analytics (gtag.js)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_location: url,
      page_title: pageTitle,
    });
  }

  // 2. Persist real event in Supabase
  try {
    supabase.from('analytics_events').insert([{
      event_name: 'page_view',
      event_path: url,
      metadata: { title: pageTitle, user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null },
    }]).then(() => {});
  } catch (e) {
    // Non-blocking
  }
};

/**
 * Track custom event in Google Analytics and Supabase
 */
export const trackEvent = (action: string, params: Record<string, any> = {}) => {
  // 1. Send to Google Analytics (gtag.js)
  if (typeof window !== 'undefined') {
    if (window.gtag) {
      window.gtag('event', action, params);
    } else if (window.dataLayer) {
      window.dataLayer.push({
        event: action,
        ...params,
      });
    }
  }

  // 2. Persist real event in Supabase
  try {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    supabase.from('analytics_events').insert([{
      event_name: action,
      event_path: currentPath,
      metadata: params,
    }]).then(() => {});
  } catch (e) {
    // Non-blocking
  }
};

/**
 * Track movie / series watch event and increment real database view count
 */
export const trackWatchMovie = (title: string, tmdbId?: string | number, category?: string, videoId?: string) => {
  trackEvent('watch_video', {
    video_id: videoId || null,
    video_title: title,
    tmdb_id: tmdbId,
    category: category || 'movie',
    timestamp: new Date().toISOString(),
  });

  // Increment real catalog view count if videoId is available
  if (videoId) {
    try {
      Promise.resolve(supabase.rpc('increment_video_view', { video_id_param: videoId }))
        .then((res: any) => {
          if (res?.error) {
            console.warn('[Analytics] Failed to increment view_count:', res.error.message);
          }
        })
        .catch((err: any) => {
          console.warn('[Analytics] RPC increment_video_view error:', err);
        });
    } catch (e) {
      // Non-blocking
    }
  }
};

/**
 * Track user search event
 */
export const trackSearch = (query: string) => {
  if (!query || query.trim().length === 0) return;
  trackEvent('search_movie', {
    search_term: query.trim(),
  });
};

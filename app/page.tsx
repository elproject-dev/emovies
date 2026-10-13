import type { Metadata } from 'next';
import HomePage from './home-page';
import { Suspense } from 'react';

import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default async function Page() {
  let initialVideos: any[] = [];
  try {
    const [moviesRes, tvRes, featuredRes] = await Promise.all([
      supabase.from('videos').select('*').in('content_type', ['movie', 'film']).order('created_at', { ascending: false }).limit(60),
      supabase.from('videos').select('*').eq('content_type', 'tv').order('created_at', { ascending: false }).limit(20),
      supabase.from('videos').select('*').eq('is_featured', true).order('created_at', { ascending: false }).limit(100),
    ]);

    const mergedIds = new Set<string>();
    for (const list of [moviesRes.data, tvRes.data, featuredRes.data]) {
      for (const v of (list || [])) {
        if (!mergedIds.has(v.id)) {
          mergedIds.add(v.id);
          initialVideos.push(v);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to pre-fetch videos for static export:', e);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <HomePage initialVideos={initialVideos} />
    </Suspense>
  );
}


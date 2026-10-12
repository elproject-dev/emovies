'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WebMCPProvider() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if the browser supports WebMCP (Chrome Model Context Protocol)
    const doc = document as any;
    if (doc.modelContext && typeof doc.modelContext.registerTool === 'function') {
      try {
        // Register Movie Search Tool
        doc.modelContext.registerTool({
          name: 'search_movies',
          description: 'Cari film dan serial TV berdasarkan judul, aktor, atau genre di katalog EMOVIES dengan subtitle Indonesia.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Judul film, serial, atau kata kunci pencarian',
              },
            },
            required: ['query'],
          },
          execute: ({ query }: { query: string }) => {
            if (query && query.trim()) {
              router.push(`/?q=${encodeURIComponent(query.trim())}`);
              return { success: true, message: `Navigating to search results for "${query}"` };
            }
            return { success: false, error: 'Query parameter is empty' };
          },
        });

        // Register Catalog Filter Tool
        doc.modelContext.registerTool({
          name: 'browse_catalog',
          description: 'Telusuri katalog film dan serial berdasarkan kategori atau status tren.',
          inputSchema: {
            type: 'object',
            properties: {
              view: {
                type: 'string',
                enum: ['trending', 'popular', 'featured', 'movie', 'tv'],
                description: 'Kategori filter: trending, popular, featured, movie (bioskop), atau tv (serial drama)',
              },
            },
            required: ['view'],
          },
          execute: ({ view }: { view: string }) => {
            if (view === 'movie' || view === 'tv') {
              router.push(`/?type=${encodeURIComponent(view)}`);
            } else {
              router.push(`/?view=${encodeURIComponent(view)}`);
            }
            return { success: true, message: `Browsing ${view} category` };
          },
        });
      } catch (err) {
        console.warn('WebMCP registration notice:', err);
      }
    }
  }, [router]);

  return null;
}

'use client';

import Script from 'next/script';
import { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { pageview } from '@/lib/analytics';

function NavigationTracker({ gaId, enabled }: { gaId: string | null; enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gaId || !enabled) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    pageview(url);
  }, [pathname, searchParams, gaId, enabled]);

  return null;
}

export default function GoogleAnalytics() {
  const [gaConfig, setGaConfig] = useState<{ id: string | null; enabled: boolean }>({
    id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null,
    enabled: true,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('ga_id, ga_enabled')
          .eq('id', 'global')
          .single();

        if (!error && data && isMounted) {
          const effectiveId = data.ga_id?.trim() || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
          setGaConfig({
            id: effectiveId,
            enabled: data.ga_enabled !== false,
          });
        }
      } catch (err) {
        console.warn('[Analytics] Failed to fetch settings:', err);
      }
    };

    fetchConfig();

    const handleCustomUpdate = (e: any) => {
      if (e.detail && isMounted) {
        setGaConfig({
          id: e.detail.ga_id?.trim() || null,
          enabled: e.detail.ga_enabled !== false,
        });
      }
    };

    window.addEventListener('emovies_ga_config_updated', handleCustomUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('emovies_ga_config_updated', handleCustomUpdate);
    };
  }, []);

  if (!gaConfig.id || !gaConfig.enabled) {
    return null;
  }

  const cleanGaId = gaConfig.id.trim();

  return (
    <>
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${cleanGaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${cleanGaId}', {
              page_path: window.location.pathname,
              send_page_view: true
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <NavigationTracker gaId={cleanGaId} enabled={gaConfig.enabled} />
      </Suspense>
    </>
  );
}

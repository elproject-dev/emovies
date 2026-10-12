'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { AnimatePresence, motion } from 'framer-motion';

export function AppBackButtonHandler() {
  const router = useRouter();
  const lastBackPress = useRef(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Setup transparent status bar on mount
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    }

    // Listener for Android hardware back button
    const setupBackButton = async () => {
      await App.addListener('backButton', async ({ canGoBack }) => {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          if (Capacitor.isNativePlatform()) {
            ScreenOrientation.lock({ orientation: 'portrait' }).then(() => {
              ScreenOrientation.unlock().catch(() => {});
            }).catch(() => {
              ScreenOrientation.unlock().catch(() => {});
            });
            StatusBar.show().catch(() => {});
          }
          return;
        }

        if (window.location.pathname !== '/') {
          router.back();
        } else {
          const currentTime = new Date().getTime();
          if (currentTime - lastBackPress.current < 2000) {
            App.exitApp();
          } else {
            lastBackPress.current = currentTime;
            
            // Show custom toast
            setShowToast(true);
            setTimeout(() => {
              setShowToast(false);
            }, 2000);
          }
        }
      });
    };

    setupBackButton();

    return () => {
      App.removeAllListeners();
    };
  }, [router]);

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className="fixed top-12 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 bg-[#333]/90 backdrop-blur-md text-white text-sm font-medium rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-gray-600/50 flex items-center justify-center whitespace-nowrap"
        >
          Tekan sekali lagi untuk keluar
        </motion.div>
      )}
    </AnimatePresence>
  );
}

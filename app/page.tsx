import type { Metadata } from 'next';
import HomePage from './home-page';
import { Suspense } from 'react';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <HomePage />
    </Suspense>
  );
}


import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Topbar from "@/components/Topbar";
import { AppBackButtonHandler } from "@/components/AppBackButtonHandler";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://emovies.com"),
  alternates: {
    canonical: "/",
  },
  title: {
    template: "%s | EMOVIES - Nonton Film & TV Series Sub Indo",
    default: "EMOVIES - Nonton Film & TV Series Sub Indo Streaming Gratis",
  },
  description: "Nonton jutaan Film dan TV Series gratis subtitle Indonesia dengan streaming lancar dan kualitas jernih. Temukan film aksi, drama, komedi, horor, dan anime hanya di EMOVIES.",
  keywords: [
    "nonton film",
    "nonton film sub indo",
    "streaming film",
    "nonton tv series",
    "film gratis",
    "emovies",
    "bioskop online",
    "streaming gratis",
    "drama korea sub indo",
    "film action",
    "film horor",
    "streaming movie indonesia"
  ],
  authors: [{ name: "EMOVIES Team" }],
  creator: "EMOVIES",
  publisher: "EMOVIES",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  openGraph: {
    title: "EMOVIES - Nonton Film & TV Series Sub Indo Streaming Gratis",
    description: "Nonton jutaan Film dan TV Series gratis dengan subtitle Indonesia. Streaming film aksi, horor, anime, komedi, dan drama terlengkap.",
    url: "https://emovies.com",
    siteName: "EMOVIES",
    images: [
      {
        url: "/emo.png",
        width: 1200,
        height: 630,
        alt: "EMOVIES Streaming Sub Indo",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EMOVIES - Nonton Film & TV Series Sub Indo Streaming Gratis",
    description: "Nonton jutaan Film dan TV Series gratis dengan subtitle Indonesia.",
    images: ["/emo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://emovies.com/#website",
      "url": "https://emovies.com",
      "name": "EMOVIES",
      "alternateName": ["EMOVIES Streaming", "EMOVIES Sub Indo"],
      "description": "Nonton Film dan TV Series Streaming Sub Indo Gratis Terlengkap",
      "inLanguage": "id-ID",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://emovies.com/?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://emovies.com/#organization",
      "name": "EMOVIES",
      "url": "https://emovies.com",
      "logo": "https://emovies.com/emo.png"
    }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body suppressHydrationWarning className={`${outfit.className} min-h-full flex flex-col bg-[#0a0a0a] text-white`}>
        <GoogleAnalytics />
        <AppBackButtonHandler />
        <Topbar />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}

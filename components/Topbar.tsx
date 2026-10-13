'use client';

import { Search, Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { trackSearch } from "@/lib/analytics";

const CATEGORIES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
];

export default function Topbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const categoryRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on page / route change
  useEffect(() => {
    setIsCategoryOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle outside click or touch to close category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };

    if (isCategoryOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isCategoryOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCategoryOpen(false);
        setIsSearchOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-colors duration-300 ${isScrolled ? 'bg-[#141414]/95 backdrop-blur-md pointer-events-auto' : 'bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none'} pb-4`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
      >
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 pointer-events-auto">

          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/icon.png"
                alt="EMOVIES Logo"
                width={36}
                height={36}
                className="hidden sm:block rounded-md group-hover:scale-110 transition-transform duration-200"
                priority
              />
              <span className="text-xl font-bold text-white block tracking-wide">
                EMO<span className="text-green-500">VIES</span>
              </span>
            </Link>
          </div>

          {/* Center: Navigation & Search */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 flex-1 ml-4 lg:ml-8">
            <nav className="flex items-center gap-4 lg:gap-5 text-[15px] font-medium text-gray-300">
              <Link href="/" className="hover:text-green-400 transition-colors">Home</Link>
              <Link href="/?type=movie" className="hover:text-green-400 transition-colors">Movies</Link>
              <Link href="/?type=tv" className="hover:text-green-400 transition-colors">TV Shows</Link>
            </nav>
          </div>

          {/* Right: Category & Search Icon */}
          <div className="flex items-center gap-3 lg:gap-6 flex-1 justify-end">

            {/* Category Dropdown (works on Click / Tap on Tablet, and Hover on Desktop) */}
            <div 
              ref={categoryRef}
              className="relative group hidden md:block"
              onMouseEnter={() => setIsCategoryOpen(true)}
              onMouseLeave={() => setIsCategoryOpen(false)}
            >
              <button 
                type="button"
                onClick={() => setIsCategoryOpen((prev) => !prev)}
                aria-expanded={isCategoryOpen}
                aria-haspopup="true"
                className={`text-[15px] font-medium transition-colors flex items-center gap-1.5 py-2 px-3 rounded-lg cursor-pointer select-none active:scale-95 ${
                  isCategoryOpen 
                    ? 'text-green-400 bg-white/10' 
                    : 'text-gray-300 hover:text-green-400 hover:bg-white/5'
                }`}
              >
                Categories
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${
                  isCategoryOpen ? 'rotate-180 text-green-400' : 'group-hover:rotate-180'
                }`} />
              </button>

              {/* Dropdown Menu */}
              <div 
                className={`absolute right-0 top-full pt-2 transition-all duration-200 transform origin-top z-50 ${
                  isCategoryOpen
                    ? 'opacity-100 visible translate-y-0 pointer-events-auto'
                    : 'opacity-0 invisible -translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto'
                }`}
              >
                <div className="bg-[#161616]/98 backdrop-blur-xl border border-gray-800 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-4 w-80 sm:w-96 max-w-[calc(100vw-2rem)] text-left">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-gray-300">
                    {CATEGORIES.map((genre) => (
                      <Link
                        key={genre}
                        href={`/?genre=${genre}`}
                        onClick={() => setIsCategoryOpen(false)}
                        className="hover:text-green-400 hover:bg-white/5 active:bg-white/15 transition-colors py-2 px-2.5 rounded-lg text-sm font-medium flex items-center justify-between"
                      >
                        <span>{genre}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className="text-gray-300 hover:text-white hover:scale-110 active:scale-95 transition-all p-2 rounded-full cursor-pointer"
            >
              <Search className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
            </button>

            {/* Mobile Menu Icon */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden text-gray-400 hover:text-white p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

        </div>
      </header>

      {/* Search Modal Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0a0a0a] border-2 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)] p-6 relative animate-in fade-in zoom-in duration-200 rounded-xl">
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-green-400 transition-colors p-1"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white mb-6">Search</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  trackSearch(searchQuery.trim());
                  setIsSearchOpen(false);
                  router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              className="relative"
              {...({
                toolname: "search_movies",
                tooldescription: "Cari film dan serial TV berdasarkan judul, aktor, atau genre di katalog EMOVIES.",
              } as Record<string, string>)}
            >
              <input
                type="text"
                name="query"
                placeholder="What do you want to watch?"
                className="w-full h-12 pl-12 pr-4 bg-[#1a1a1a] text-white text-base md:text-lg border-2 border-gray-800 focus:border-green-500 focus:outline-none focus:ring-0 transition-colors placeholder-gray-600 font-medium rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                {...({
                  toolparamdescription: "Judul atau kata kunci film yang ingin dicari",
                } as Record<string, string>)}
              />
              <button
                type="submit"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-400 transition-colors p-1"
                aria-label="Submit search"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
            <div className="mt-4 text-sm text-gray-500 text-center">
              Press Enter or tap Search icon
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col md:hidden animate-in slide-in-from-right duration-300">
          <div 
            className="flex justify-end px-6 pb-6"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
          >
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              className="text-gray-400 hover:text-green-400 transition-colors p-1"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
          <div className="flex flex-col items-center justify-start flex-1 gap-6 text-xl font-medium overflow-y-auto pt-4 pb-20">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-green-400 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/?type=movie"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-green-400 transition-colors"
            >
              Movies
            </Link>
            <Link
              href="/?type=tv"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-green-400 transition-colors"
            >
              TV Shows
            </Link>

            <div className="w-24 h-px bg-gray-800 my-2"></div>

            <button
              type="button"
              onClick={() => setIsMobileCategoryOpen(!isMobileCategoryOpen)}
              className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition-colors uppercase tracking-widest text-sm cursor-pointer"
            >
              <span>Categories</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMobileCategoryOpen ? 'rotate-180 text-green-400' : ''}`} />
            </button>

            {isMobileCategoryOpen && (
              <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-center text-base px-4 mt-2 animate-in fade-in zoom-in-95 duration-200">
                {CATEGORIES.map((genre) => (
                  <Link
                    key={genre}
                    href={`/?genre=${genre}`}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsMobileCategoryOpen(false);
                    }}
                    className="text-gray-300 hover:text-green-400 transition-colors"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { CityConfig } from "@/lib/cities";

interface HeaderProps {
  city?: CityConfig;
  onCityChange?: () => void;
  onSearch?: (query: string) => void;
  isSearchLoading?: boolean;
}

const EXAMPLES = [
  "Тихое кафе с Wi-Fi",
  "Где погулять с ребёнком",
  "Лучший шашлык рядом",
  "Бар с живой музыкой",
];

export function Header({ city, onCityChange, onSearch, isSearchLoading }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim() && onSearch) {
        onSearch(query.trim());
        setFocused(false);
      }
    },
    [query, onSearch],
  );

  const handleExample = useCallback(
    (ex: string) => {
      setQuery(ex);
      onSearch?.(ex);
      setFocused(false);
    },
    [onSearch],
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 px-3 pt-2 sm:px-4">
      <nav className="mx-auto flex h-10 max-w-screen-xl items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/90 px-3 shadow-lg backdrop-blur-md sm:h-11 sm:gap-3 sm:px-4">
        {/* Logo + City */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
        >
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 sm:h-6 sm:w-6" />
          <span className="hidden text-sm font-bold text-white sm:inline">LiveCity</span>
        </Link>

        {city && onCityChange && (
          <>
            <div className="hidden h-4 w-px bg-zinc-700 sm:block" />
            <button
              onClick={onCityChange}
              className="hidden shrink-0 text-xs text-zinc-400 transition-colors hover:text-white sm:block"
              title="Сменить город"
            >
              {city.name}
            </button>
          </>
        )}

        {/* Search — integrated into nav */}
        {onSearch && (
          <div ref={wrapperRef} className="relative mx-1 flex-1 sm:mx-2">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  placeholder="Что ищете?..."
                  aria-label="Поиск заведений"
                  className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/60 px-3 py-1.5 pr-10 text-xs text-white placeholder-zinc-500 transition-colors focus:border-emerald-500/50 focus:bg-zinc-800 focus:outline-none sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={isSearchLoading || !query.trim()}
                  aria-label="Искать с помощью AI"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 sm:text-xs"
                >
                  {isSearchLoading ? "..." : "AI"}
                </button>
              </div>
            </form>

            {/* Example chips dropdown */}
            {focused && !query && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900/95 p-2 shadow-xl backdrop-blur">
                <p className="mb-1.5 text-[10px] text-zinc-500">Попробуйте:</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => handleExample(ex)}
                      className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav links */}
        <Link
          href="/planner"
          className="hidden shrink-0 text-xs font-medium text-zinc-400 transition-colors hover:text-white lg:block"
        >
          Планировщик
        </Link>
        <Link
          href="/insights"
          className="hidden shrink-0 text-xs font-medium text-zinc-400 transition-colors hover:text-white lg:block"
        >
          AI-анализ
        </Link>
        <Link
          href="/dashboard"
          className="shrink-0 rounded-lg bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Владельцам
        </Link>
      </nav>
    </header>
  );
}

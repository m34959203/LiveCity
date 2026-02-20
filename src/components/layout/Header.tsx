"use client";

import Link from "next/link";
import type { CityConfig } from "@/lib/cities";

interface HeaderProps {
  city?: CityConfig;
  onCityChange?: () => void;
}

export function Header({ city, onCityChange }: HeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 px-3 pt-2 sm:px-4">
      <nav className="mx-auto flex h-10 max-w-screen-xl items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/90 px-3 shadow-lg backdrop-blur-md sm:h-11 sm:px-4">
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
            <div className="h-4 w-px bg-zinc-700" />
            <button
              onClick={onCityChange}
              className="text-xs text-zinc-400 transition-colors hover:text-white"
              title="Сменить город"
            >
              {city.name}
            </button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Nav links */}
        <Link
          href="/planner"
          className="hidden text-xs font-medium text-zinc-400 transition-colors hover:text-white sm:block"
        >
          Планировщик
        </Link>
        <Link
          href="/insights"
          className="hidden text-xs font-medium text-zinc-400 transition-colors hover:text-white sm:block"
        >
          AI-анализ
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Владельцам
        </Link>
      </nav>
    </header>
  );
}

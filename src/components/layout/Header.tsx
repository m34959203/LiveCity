"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-0 items-center">
      {/* Logo - floating over map */}
      <Link
        href="/"
        className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-xl bg-zinc-900/90 px-3 py-2 backdrop-blur"
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500" />
        <span className="text-sm font-bold text-white">LiveCity</span>
      </Link>

      {/* Nav links - floating top right */}
      <div className="absolute right-3 top-4 z-30 flex items-center gap-1.5 sm:right-4">
        <Link
          href="/planner"
          className="rounded-lg bg-zinc-900/90 px-3 py-2 text-xs font-medium text-zinc-300 backdrop-blur hover:text-white"
        >
          Планировщик
        </Link>
        <Link
          href="/insights"
          className="rounded-lg bg-zinc-900/90 px-3 py-2 text-xs font-medium text-zinc-300 backdrop-blur hover:text-white"
        >
          AI-анализ
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-gradient-to-r from-emerald-600/90 to-cyan-600/90 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:opacity-90"
        >
          Владельцам
        </Link>
      </div>
    </header>
  );
}

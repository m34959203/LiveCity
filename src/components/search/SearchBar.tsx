"use client";

import { useState, useCallback } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  "Тихое кафе с Wi-Fi для работы",
  "Где погулять с ребёнком",
  "Лучший шашлык рядом",
  "Бар с живой музыкой",
];

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) onSearch(query.trim());
    },
    [query, onSearch],
  );

  return (
    <div className="absolute left-3 right-3 top-14 z-20 sm:left-44 sm:right-4 sm:top-14 md:right-80">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Что ищете? Например: тихое кафе с Wi-Fi..."
            aria-label="Поиск заведений"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-3 pr-12 text-sm text-white placeholder-zinc-500 shadow-xl backdrop-blur focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            aria-label="Искать с помощью AI"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
          >
            {isLoading ? "..." : "AI"}
          </button>
        </div>
      </form>

      {/* Example chips */}
      {!query && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex);
                onSearch(ex);
              }}
              className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs text-zinc-400 backdrop-blur transition-colors hover:bg-zinc-700 hover:text-white"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

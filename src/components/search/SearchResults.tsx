"use client";

import { VenueCard } from "@/components/venue/VenueCard";
import type { SearchResultItem } from "@/types/search";

interface SearchResultsProps {
  results: SearchResultItem[];
  interpretation?: string;
  isLoading: boolean;
  onVenueClick: (venueId: string) => void;
  onClose: () => void;
}

export function SearchResults({
  results,
  interpretation,
  isLoading,
  onVenueClick,
  onClose,
}: SearchResultsProps) {
  return (
    <div className="absolute left-3 right-3 top-14 z-20 max-h-[55vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur sm:left-3 sm:right-auto sm:top-14 sm:w-80">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-emerald-400">
          AI-результаты
        </span>
        <button
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-white"
        >
          ✕
        </button>
      </div>

      {interpretation && (
        <p className="mb-3 text-xs text-zinc-400 italic">{interpretation}</p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-zinc-800"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">
          Ничего не найдено. Попробуйте другой запрос.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <div key={r.venue.id}>
              <VenueCard
                venue={r.venue}
                onClick={() => onVenueClick(r.venue.id)}
              />
              {r.reason && (
                <p className="mt-1 px-2 text-xs text-zinc-500">{r.reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

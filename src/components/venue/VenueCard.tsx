"use client";

import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import type { VenueListItem } from "@/types/venue";

interface VenueCardProps {
  venue: VenueListItem;
  onClick?: () => void;
}

export function VenueCard({ venue, onClick }: VenueCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left transition-colors hover:border-zinc-600"
    >
      <LiveScoreBadge score={venue.liveScore} size="md" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-white">{venue.name}</h3>
        <p className="truncate text-sm text-zinc-400">{venue.address}</p>
        <div className="mt-1 flex gap-1">
          <span
            className="rounded px-1.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: venue.category.color + "20",
              color: venue.category.color,
            }}
          >
            {venue.category.name}
          </span>
          {venue.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

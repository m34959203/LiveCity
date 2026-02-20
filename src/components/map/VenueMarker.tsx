"use client";

import { Marker } from "react-map-gl/mapbox";
import type { VenueListItem } from "@/types/venue";

interface VenueMarkerProps {
  venue: VenueListItem;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
}

function markerColor(score: number): string {
  if (score >= 8) return "#10b981";
  if (score >= 5) return "#f59e0b";
  return "#71717a";
}

const MUTED_COLOR = "#3f3f46"; // zinc-700

export function VenueMarker({ venue, isSelected, isHighlighted, onClick }: VenueMarkerProps) {
  const active = isSelected || isHighlighted;
  const color = active ? markerColor(venue.liveScore) : MUTED_COLOR;
  const scale = isSelected ? 1.3 : 1;

  return (
    <Marker
      latitude={venue.latitude}
      longitude={venue.longitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div
        className="relative cursor-pointer transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
        title={`${venue.name} — ${venue.liveScore}`}
      >
        {/* Pulse ring for selected venue */}
        {isSelected && (
          <div
            className="absolute inset-0 animate-ping rounded-full opacity-20"
            style={{ backgroundColor: color, animationDuration: "2s" }}
          />
        )}

        {/* Main marker */}
        <div
          className="relative flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-colors duration-300"
          style={{
            backgroundColor: color,
            color: active ? "#fff" : "#a1a1aa",
            boxShadow: isSelected ? `0 0 12px ${color}90` : "none",
          }}
        >
          {venue.liveScore.toFixed(1)}
        </div>
      </div>
    </Marker>
  );
}

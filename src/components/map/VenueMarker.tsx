"use client";

import { Marker } from "react-map-gl/mapbox";
import type { VenueListItem } from "@/types/venue";

interface VenueMarkerProps {
  venue: VenueListItem;
  isSelected: boolean;
  onClick: () => void;
}

function markerColor(score: number): string {
  if (score >= 8) return "#10b981";
  if (score >= 5) return "#f59e0b";
  return "#71717a";
}

/**
 * Pulse intensity based on live score.
 * High score = active venue = visible pulse animation.
 * Low score = "dead" venue = no pulse.
 */
function shouldPulse(score: number): boolean {
  return score >= 7;
}

export function VenueMarker({ venue, isSelected, onClick }: VenueMarkerProps) {
  const color = markerColor(venue.liveScore);
  const scale = isSelected ? 1.3 : 1;
  const pulse = shouldPulse(venue.liveScore);

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
        {/* Pulse ring for "alive" venues */}
        {pulse && (
          <div
            className="absolute inset-0 animate-ping rounded-full opacity-30"
            style={{ backgroundColor: color, animationDuration: "2s" }}
          />
        )}

        {/* Main marker */}
        <div
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 ${pulse ? "14" : "10"}px ${color}${pulse ? "a0" : "80"}`,
          }}
        >
          {venue.liveScore.toFixed(0)}
        </div>
      </div>
    </Marker>
  );
}

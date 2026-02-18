"use client";

import { useEffect, useState } from "react";
import { LiveScoreBadge } from "@/components/ui/LiveScoreBadge";
import type { VenueDetail } from "@/types/venue";

interface VenueDetailsProps {
  venueId: string | null;
  onClose: () => void;
}

export function VenueDetails({ venueId, onClose }: VenueDetailsProps) {
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!venueId) {
      setVenue(null);
      return;
    }
    setLoading(true);
    fetch(`/api/venues/${venueId}`)
      .then((r) => r.json())
      .then((res) => setVenue(res.data))
      .catch(() => setVenue(null))
      .finally(() => setLoading(false));
  }, [venueId]);

  if (!venueId) return null;

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-white">
          {loading ? "Загрузка..." : venue?.name}
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          ✕
        </button>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
        </div>
      )}

      {venue && !loading && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Score + Category */}
          <div className="mb-4 flex items-center gap-4">
            <LiveScoreBadge score={venue.liveScore} size="lg" />
            <div>
              <span
                className="rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: venue.category.color + "20",
                  color: venue.category.color,
                }}
              >
                {venue.category.name}
              </span>
            </div>
          </div>

          {/* Address */}
          <p className="mb-4 text-sm text-zinc-400">{venue.address}</p>

          {/* Tags */}
          {venue.tagDetails && venue.tagDetails.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {venue.tagDetails.map((t) => (
                <span
                  key={t.slug}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {/* AI Description */}
          {venue.aiDescription && (
            <div className="mb-4 rounded-lg bg-zinc-900 p-3">
              <p className="mb-1 text-xs font-medium text-emerald-400">
                AI-анализ
              </p>
              <p className="text-sm text-zinc-300">{venue.aiDescription}</p>
            </div>
          )}

          {/* Description */}
          {venue.description && (
            <p className="mb-4 text-sm text-zinc-300">{venue.description}</p>
          )}

          {/* Working Hours */}
          {venue.workingHours && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-zinc-200">
                Часы работы
              </h4>
              <div className="grid grid-cols-2 gap-1 text-xs text-zinc-400">
                {Object.entries(venue.workingHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="uppercase">{day}</span>
                    <span>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {venue.recentReviews && venue.recentReviews.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-zinc-200">
                Последние отзывы
              </h4>
              <div className="space-y-2">
                {venue.recentReviews.slice(0, 5).map((r, i) => (
                  <div key={i} className="rounded-lg bg-zinc-900 p-3">
                    <p className="text-sm text-zinc-300">{r.text}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{r.source}</span>
                      <span
                        className={
                          r.sentiment > 0.3
                            ? "text-emerald-500"
                            : r.sentiment < -0.3
                              ? "text-red-400"
                              : "text-zinc-500"
                        }
                      >
                        {r.sentiment > 0.3
                          ? "+"
                          : r.sentiment < -0.3
                            ? "-"
                            : "~"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp Button */}
          {venue.whatsapp && (
            <a
              href={`https://wa.me/${venue.whatsapp}?text=${encodeURIComponent(`Привет! Пишу из LiveCity по поводу ${venue.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block w-full rounded-xl bg-emerald-600 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Написать в WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}

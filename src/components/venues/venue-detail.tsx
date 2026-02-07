"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Phone,
  MessageCircle,
  Globe,
  Clock,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { LiveScoreBadge } from "./live-score-badge";
import { whatsappLink } from "@/lib/utils";
import type { Database } from "@/types/database";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type Review = Database["public"]["Tables"]["reviews_analyzed"]["Row"];

interface VenueDetailProps {
  slug: string;
}

export function VenueDetail({ slug }: VenueDetailProps) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        // First fetch the venue by slug via the list endpoint with a filter
        const listRes = await fetch(`/api/venues?slug=${slug}`);
        if (!listRes.ok) return;
        const listData = await listRes.json();
        const found = listData.venues?.[0];
        if (!found) return;

        // Then fetch full details by ID
        const detailRes = await fetch(`/api/venues/${found.id}`);
        if (!detailRes.ok) return;
        const detailData = await detailRes.json();
        setVenue(detailData.venue);
        setReviews(detailData.reviews ?? []);
      } catch (err) {
        console.error("Failed to fetch venue:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-lg font-medium">Место не найдено</p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Вернуться на карту
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к карте
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{venue.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5">{venue.category}</span>
            {venue.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {venue.address}
              </span>
            )}
          </div>
        </div>
        <LiveScoreBadge score={venue.live_score} size="lg" showLabel />
      </div>

      {/* Description */}
      {venue.description && (
        <p className="mt-4 text-sm text-muted-foreground">{venue.description}</p>
      )}

      {/* AI Summary */}
      {venue.ai_summary && (
        <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-xs font-medium text-accent">AI-резюме</p>
          <p className="mt-1 text-sm">{venue.ai_summary}</p>
        </div>
      )}

      {/* Tags */}
      {venue.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {venue.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        {venue.whatsapp && venue.claim_status !== "unclaimed" && (
          <a
            href={whatsappLink(venue.whatsapp, venue.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            Написать в WhatsApp
          </a>
        )}
        {venue.phone && (
          <a
            href={`tel:${venue.phone}`}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Phone className="h-4 w-4" />
            {venue.claim_status === "unclaimed" ? "Позвонить" : venue.phone}
          </a>
        )}
        {venue.website && (
          <a
            href={venue.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Globe className="h-4 w-4" />
            Сайт
          </a>
        )}
      </div>

      {/* Reviews */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5" />
          Последние упоминания
          <span className="text-sm font-normal text-muted-foreground">
            ({reviews.length})
          </span>
        </h2>

        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Упоминаний пока нет
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {review.source}
                    </span>
                    {review.source_author && (
                      <span className="text-xs text-muted-foreground">
                        {review.source_author}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      review.sentiment > 0
                        ? "text-emerald-500"
                        : review.sentiment < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {review.sentiment > 0 ? "+" : ""}
                    {review.sentiment.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{review.original_text}</p>
                {review.ai_summary && (
                  <p className="mt-1.5 text-xs italic text-muted-foreground">
                    {review.ai_summary}
                  </p>
                )}
                {review.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

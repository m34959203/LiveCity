import Link from "next/link";
import { MapPin, MessageCircle, Phone, Clock } from "lucide-react";
import { LiveScoreBadge } from "./live-score-badge";
import { whatsappLink } from "@/lib/utils";
import type { Database } from "@/types/database";

type Venue = Database["public"]["Tables"]["venues"]["Row"];

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  return (
    <div className="border-b border-border p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <Link
            href={`/venue/${venue.slug}`}
            className="font-medium transition-colors hover:text-primary"
          >
            {venue.name}
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5">{venue.category}</span>
            {venue.subcategory && (
              <span className="rounded bg-muted px-1.5 py-0.5">{venue.subcategory}</span>
            )}
          </div>
          {venue.address && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {venue.address}
            </p>
          )}
          {venue.ai_summary && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {venue.ai_summary}
            </p>
          )}
        </div>

        <LiveScoreBadge score={venue.live_score} />
      </div>

      {/* Tags */}
      {venue.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {venue.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        {venue.whatsapp && venue.claim_status !== "unclaimed" && (
          <a
            href={whatsappLink(venue.whatsapp, venue.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </a>
        )}
        {venue.phone && venue.claim_status === "unclaimed" && (
          <a
            href={`tel:${venue.phone}`}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Phone className="h-3 w-3" />
            Позвонить
          </a>
        )}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {venue.review_count} отзывов
        </span>
      </div>
    </div>
  );
}

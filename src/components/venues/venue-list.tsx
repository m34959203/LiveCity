"use client";

import { useEffect, useState } from "react";
import { VenueCard } from "./venue-card";
import { Loader2 } from "lucide-react";
import type { Database } from "@/types/database";

type Venue = Database["public"]["Tables"]["venues"]["Row"];

export function VenueList() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const res = await fetch("/api/venues");
        if (res.ok) {
          const data = await res.json();
          setVenues(data.venues ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch venues:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Мест пока нет
        </p>
        <p className="text-xs text-muted-foreground">
          Попробуйте поиск или измените фильтры
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {venues.length} мест найдено
        </span>
      </div>
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} />
      ))}
    </div>
  );
}

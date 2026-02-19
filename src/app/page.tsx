"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { VenueDetails } from "@/components/venue/VenueDetails";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CategoryFilter } from "@/components/map/CategoryFilter";
import type { VenueListItem } from "@/types/venue";
import type { SearchResultItem } from "@/types/search";

// Mapbox must load client-side only
const MapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500" />
      </div>
    ),
  },
);

export default function Home() {
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchInterpretation, setSearchInterpretation] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [venuesError, setVenuesError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load venues
  useEffect(() => {
    fetch("/api/venues?limit=100")
      .then((r) => r.json())
      .then((res) => setVenues(res.data || []))
      .catch(() => setVenuesError(true));
  }, []);

  // Filter venues by category
  const filteredVenues = useMemo(() => {
    if (!activeCategory) return venues;
    return venues.filter((v) => v.category.slug === activeCategory);
  }, [venues, activeCategory]);

  // Close panels on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedVenueId(null);
        setShowSearchResults(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // AI Search
  const handleSearch = useCallback(async (query: string) => {
    setSearchLoading(true);
    setShowSearchResults(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 5 }),
      });
      const data = await res.json();
      if (data.data) {
        setSearchResults(data.data.results || []);
        setSearchInterpretation(data.data.interpretation || "");
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleVenueClick = useCallback((venueId: string) => {
    setSelectedVenueId(venueId);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      <Header />

      {/* Search */}
      <SearchBar onSearch={handleSearch} isLoading={searchLoading} />

      {/* Category Filter */}
      <CategoryFilter
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Search Results */}
      {showSearchResults && (
        <SearchResults
          results={searchResults}
          interpretation={searchInterpretation}
          isLoading={searchLoading}
          onVenueClick={handleVenueClick}
          onClose={() => {
            setShowSearchResults(false);
            setSearchResults([]);
          }}
        />
      )}

      {/* Map */}
      <ErrorBoundary>
        <MapView
          venues={filteredVenues}
          onVenueClick={handleVenueClick}
          selectedVenueId={selectedVenueId}
        />
      </ErrorBoundary>

      {/* Venue Details Panel */}
      <VenueDetails
        venueId={selectedVenueId}
        onClose={() => setSelectedVenueId(null)}
      />

      {/* Error toast */}
      {venuesError && (
        <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-800 bg-red-950/90 px-4 py-2 text-sm text-red-300 backdrop-blur">
          Не удалось загрузить заведения. Проверьте подключение к БД.
        </div>
      )}
    </div>
  );
}

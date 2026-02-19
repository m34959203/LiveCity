import { logger } from "./logger";

// ============================================
// Apify 2GIS Places Scraper — Discovery Client
// ============================================
// Uses 2GIS Places Scraper on Apify to discover venues.
// Actor: configured via APIFY_2GIS_PLACES_ACTOR env var
//
// Used by:
//   - venue-scout CRON (City Radar) — bulk discovery
//   - lazy discovery — user search fallback
//
// Env vars:
//   APIFY_TOKEN — Apify API token
//   APIFY_2GIS_PLACES_ACTOR — Actor ID for 2GIS Places Scraper
// ============================================

/** A single place discovered from 2GIS via Apify */
export interface TwoGisPlace {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  phone?: string;
  url?: string; // 2GIS URL for the place
  rating?: number;
  reviewCount?: number;
}

export class Apify2GisClient {
  private token: string;
  private actorId: string;

  constructor() {
    this.token = process.env.APIFY_TOKEN || "";
    this.actorId = process.env.APIFY_2GIS_PLACES_ACTOR || "";
  }

  /** Check if Apify 2GIS discovery is configured */
  isConfigured(): boolean {
    return this.token.length > 0 && this.actorId.length > 0;
  }

  /**
   * Search 2GIS for places matching a query in a city.
   * Launches an Apify actor run and waits for results.
   * @param query - Search query (e.g. "кафе", "рестораны")
   * @param city - City name (e.g. "Алматы")
   * @param maxItems - Max results to fetch (default 20)
   */
  async searchPlaces(
    query: string,
    city: string,
    maxItems: number = 20,
  ): Promise<TwoGisPlace[]> {
    try {
      // Start actor run with synchronous wait (up to 120s)
      const searchQuery = `${query} ${city}`;
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items?token=${this.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            searchQueries: [searchQuery],
            maxItems,
            language: "ru",
          }),
          signal: AbortSignal.timeout(120_000),
        },
      );

      if (!runRes.ok) {
        logger.warn("2GIS Apify discovery: actor run failed", {
          endpoint: "Apify2GisClient.searchPlaces",
          error: `${runRes.status} ${runRes.statusText}`,
        });
        return [];
      }

      const items: Record<string, unknown>[] = await runRes.json();

      if (!Array.isArray(items) || items.length === 0) {
        logger.info("2GIS Apify discovery: no results", {
          endpoint: "Apify2GisClient.searchPlaces",
        });
        return [];
      }

      return items
        .filter((item) => item.name && (item.address || item.location))
        .map((item) => {
          const loc = item.location as
            | { lat?: number; lng?: number }
            | undefined;
          const coords = item.coordinates as
            | { lat?: number; lng?: number }
            | undefined;

          return {
            name: String(item.name),
            address: String(item.address || item.fullAddress || ""),
            latitude: loc?.lat ?? coords?.lat ?? 0,
            longitude: loc?.lng ?? coords?.lng ?? 0,
            category: String(item.category || item.rubric || ""),
            phone: item.phone ? String(item.phone) : undefined,
            url: item.url ? String(item.url) : undefined,
            rating: typeof item.rating === "number" ? item.rating : undefined,
            reviewCount:
              typeof item.reviewCount === "number"
                ? item.reviewCount
                : undefined,
          };
        })
        .filter((p) => p.latitude !== 0 && p.longitude !== 0);
    } catch (error) {
      logger.error("2GIS Apify discovery failed", {
        endpoint: "Apify2GisClient.searchPlaces",
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

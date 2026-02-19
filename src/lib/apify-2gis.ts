import { logger } from "./logger";

// ============================================
// Apify 2GIS Places Scraper — Discovery Client
// ============================================
// Actor: m_mamaev/2gis-places-scraper (ID via APIFY_2GIS_PLACES_ACTOR)
//
// Input schema (discovered from build):
//   query: string[]     — Search queries (e.g. ["рестораны"])
//   location: string    — City/location name (e.g. "Алматы")
//   maxItems: number    — Max results to fetch
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
  private schemaLogged = false;

  constructor() {
    this.token = process.env.APIFY_TOKEN || "";
    this.actorId = process.env.APIFY_2GIS_PLACES_ACTOR || "";
  }

  /** Check if Apify 2GIS discovery is configured */
  isConfigured(): boolean {
    return this.token.length > 0 && this.actorId.length > 0;
  }

  /**
   * Log the full input schema once (for debugging).
   * Fetches the actor's build and logs inputSchema in chunks.
   */
  private async logSchemaOnce(): Promise<void> {
    if (this.schemaLogged) return;
    this.schemaLogged = true;

    try {
      // Get actor info to find latest build ID
      const actorRes = await fetch(
        `https://api.apify.com/v2/acts/${this.actorId}?token=${this.token}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!actorRes.ok) return;

      const raw = await actorRes.json();
      const actorInfo = raw?.data ?? raw;
      const buildId = actorInfo?.taggedBuilds?.latest?.buildId;
      if (!buildId) return;

      // Fetch the build to get full input schema
      const buildRes = await fetch(
        `https://api.apify.com/v2/acts/${this.actorId}/builds/${buildId}?token=${this.token}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!buildRes.ok) return;

      const buildRaw = await buildRes.json();
      const buildData = buildRaw?.data ?? buildRaw;
      const schema = buildData?.inputSchema ?? "";
      if (!schema) return;

      const schemaStr = typeof schema === "string" ? schema : JSON.stringify(schema);
      // Log in chunks of 800 chars to avoid truncation
      for (let i = 0; i < schemaStr.length; i += 800) {
        const chunk = schemaStr.slice(i, i + 800);
        logger.info(`2GIS schema [${i}..${i + chunk.length}]: ${chunk}`, {
          endpoint: "Apify2GisClient.logSchema",
        });
      }
    } catch {
      // Schema logging is best-effort
    }
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
    // Log full schema on first call (non-blocking)
    this.logSchemaOnce().catch(() => {});

    try {
      // m_mamaev/2gis-places-scraper input format:
      //   query: array of search strings
      //   location: city name (as separate field, NOT in query)
      //   maxItems: max results
      const input = {
        query: [query],
        location: city,
        maxItems,
      };

      logger.info(`2GIS Apify: search query=["${query}"] location="${city}" maxItems=${maxItems}`, {
        endpoint: "Apify2GisClient.searchPlaces",
      });

      // Start actor run with synchronous wait (up to 120s)
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${this.actorId}/run-sync-get-dataset-items?token=${this.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(120_000),
        },
      );

      if (!runRes.ok) {
        const errorBody = await runRes.text().catch(() => "(no body)");
        logger.warn("2GIS Apify discovery: actor run failed", {
          endpoint: "Apify2GisClient.searchPlaces",
          error: `${runRes.status} ${runRes.statusText} | body=${errorBody.slice(0, 400)}`,
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

      logger.info(`2GIS Apify: got ${items.length} raw items for "${query}" in ${city}`, {
        endpoint: "Apify2GisClient.searchPlaces",
      });

      // Log first item keys for output schema debugging
      if (items.length > 0) {
        const firstItem = items[0];
        logger.info(`2GIS Apify: first item keys=${Object.keys(firstItem).join(",")} | sample=${JSON.stringify(firstItem).slice(0, 500)}`, {
          endpoint: "Apify2GisClient.searchPlaces",
        });
      }

      return items
        .filter((item) => item.name && (item.address || item.location || item.address_name))
        .map((item) => {
          // Handle different output schemas from various 2GIS Apify actors
          const loc = item.location as
            | { lat?: number; lng?: number }
            | undefined;
          const coords = item.coordinates as
            | { lat?: number; lng?: number }
            | undefined;
          const point = item.point as
            | { lat?: number; lon?: number }
            | undefined;

          return {
            name: String(item.name),
            address: String(item.address || item.address_name || item.fullAddress || ""),
            latitude: loc?.lat ?? coords?.lat ?? point?.lat ?? (typeof item.lat === "number" ? item.lat : 0),
            longitude: loc?.lng ?? coords?.lng ?? point?.lon ?? (typeof item.lng === "number" ? item.lng : 0),
            category: String(item.category || item.rubric || item.primary_rubric || ""),
            phone: item.phone ? String(item.phone) : undefined,
            url: item.url ? String(item.url) : (item.link ? String(item.link) : undefined),
            rating: typeof item.rating === "number" ? item.rating : undefined,
            reviewCount:
              typeof item.reviewCount === "number"
                ? item.reviewCount
                : (typeof item.review_count === "number" ? item.review_count : undefined),
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

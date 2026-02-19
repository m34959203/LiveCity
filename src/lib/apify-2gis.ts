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

// City name → 2GIS URL slug mapping (KZ cities use 2gis.kz)
const CITY_SLUG_MAP: Record<string, { slug: string; domain: string }> = {
  Алматы: { slug: "almaty", domain: "2gis.kz" },
  Астана: { slug: "astana", domain: "2gis.kz" },
  Караганда: { slug: "karaganda", domain: "2gis.kz" },
  Шымкент: { slug: "shymkent", domain: "2gis.kz" },
  Жезказган: { slug: "zhezkazgan", domain: "2gis.kz" },
  Актобе: { slug: "aktobe", domain: "2gis.kz" },
  Павлодар: { slug: "pavlodar", domain: "2gis.kz" },
  Семей: { slug: "semey", domain: "2gis.kz" },
  Атырау: { slug: "atyrau", domain: "2gis.kz" },
  Костанай: { slug: "kostanay", domain: "2gis.kz" },
  Тараз: { slug: "taraz", domain: "2gis.kz" },
  Уральск: { slug: "uralsk", domain: "2gis.kz" },
  Петропавловск: { slug: "petropavlovsk", domain: "2gis.kz" },
  Кызылорда: { slug: "kyzylorda", domain: "2gis.kz" },
  Темиртау: { slug: "temirtau", domain: "2gis.kz" },
  Экибастуз: { slug: "ekibastuz", domain: "2gis.kz" },
};

/** Build a 2GIS search URL for a city + query */
function build2GisSearchUrl(city: string, query: string): string | null {
  const mapping = CITY_SLUG_MAP[city];
  if (!mapping) {
    logger.warn(`2GIS: no slug mapping for city "${city}"`, {
      endpoint: "Apify2GisClient.build2GisSearchUrl",
    });
    return null;
  }
  return `https://${mapping.domain}/${mapping.slug}/search/${encodeURIComponent(query)}`;
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
    const searchUrl = build2GisSearchUrl(city, query);
    if (!searchUrl) {
      return [];
    }

    try {
      // Try Apify standard startUrls format (array of {url} objects)
      const input = {
        startUrls: [{ url: searchUrl }],
        maxPlaces: maxItems,
        language: "ru",
      };

      logger.info(`2GIS Apify: starting actor run | ${searchUrl} | input=${JSON.stringify(input).slice(0, 300)}`, {
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
          error: `${runRes.status} ${runRes.statusText} | url=${searchUrl} | body=${errorBody.slice(0, 400)}`,
        });
        return [];
      }

      const items: Record<string, unknown>[] = await runRes.json();

      if (!Array.isArray(items) || items.length === 0) {
        logger.info("2GIS Apify discovery: no results", {
          endpoint: "Apify2GisClient.searchPlaces",
          searchUrl,
        });
        return [];
      }

      logger.info(`2GIS Apify: got ${items.length} raw items`, {
        endpoint: "Apify2GisClient.searchPlaces",
        searchUrl,
      });

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

import { logger } from "@/lib/logger";

/**
 * TwoGisService — own 2GIS parser, replaces Apify dependency.
 *
 * Uses public 2GIS APIs:
 *   - Catalog API: search venues, get details (address, hours, phone, rating)
 *   - Reviews API: fetch actual review text + ratings
 *
 * No API key required — these are public endpoints.
 */

// ============================================
// Types
// ============================================

export interface TwoGisVenueInfo {
  twoGisId: string;
  name: string;
  address: string;
  phone: string | null;
  workingHours: Record<string, string> | null;
  rating: number | null;
  reviewCount: number;
  lat: number;
  lng: number;
}

export interface TwoGisReview {
  text: string;
  rating: number;
  author: string;
  date?: string;
}

// ============================================
// Constants
// ============================================

const CATALOG_API = "https://catalog.api.2gis.com/3.0";
const REVIEWS_API = "https://public-api.reviews.2gis.com/2.0";
const TIMEOUT_MS = 15_000;

// 2GIS public API key (embedded in their web app, safe to use)
const API_KEY = "rurbbn3446";

// ============================================
// Service
// ============================================

export class TwoGisService {
  /**
   * Search for a venue on 2GIS by name + coordinates.
   * Returns the best match with full details.
   */
  static async searchVenue(
    name: string,
    lat: number,
    lng: number,
    cityName: string,
  ): Promise<TwoGisVenueInfo | null> {
    try {
      const query = `${name} ${cityName}`;
      const url =
        `${CATALOG_API}/items?q=${encodeURIComponent(query)}` +
        `&point=${lng},${lat}` +
        `&radius=2000` +
        `&fields=items.point,items.address,items.schedule,items.contact_groups,items.reviews,items.external_content` +
        `&key=${API_KEY}` +
        `&locale=ru_KZ` +
        `&type=branch` +
        `&page_size=5`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        logger.warn(`2GIS catalog search failed: ${res.status}`, {
          endpoint: "TwoGisService.searchVenue",
        });
        return null;
      }

      const data = await res.json();
      const items = data?.result?.items;
      if (!items || items.length === 0) return null;

      // Find best match by name similarity
      const best = this.findBestMatch(items, name, lat, lng);
      if (!best) return null;

      return this.parseVenueItem(best);
    } catch (error) {
      logger.error("2GIS venue search failed", {
        endpoint: "TwoGisService.searchVenue",
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Fetch reviews for a 2GIS venue by its branch ID.
   * Returns up to `limit` reviews sorted by date.
   */
  static async fetchReviews(
    twoGisId: string,
    limit = 20,
  ): Promise<TwoGisReview[]> {
    try {
      const url =
        `${REVIEWS_API}/branches/${twoGisId}/reviews` +
        `?key=${API_KEY}` +
        `&locale=ru_KZ` +
        `&is_advertiser=false` +
        `&fields=meta.providers,meta.branch_rating,meta.branch_reviews_count,meta.total_count` +
        `&sort_by=date_edited` +
        `&limit=${limit}` +
        `&offset=0`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        logger.warn(`2GIS reviews fetch failed: ${res.status}`, {
          endpoint: "TwoGisService.fetchReviews",
        });
        return [];
      }

      const data = await res.json();
      const reviews = data?.reviews;
      if (!Array.isArray(reviews)) return [];

      return reviews
        .filter(
          (r: Record<string, unknown>) =>
            r.text && typeof r.text === "string" && (r.text as string).length > 5,
        )
        .map((r: Record<string, unknown>) => ({
          text: r.text as string,
          rating: typeof r.rating === "number" ? r.rating : 3,
          author:
            (r.user as Record<string, unknown>)?.name
              ? String((r.user as Record<string, unknown>).name)
              : "Гость",
          date: r.date_edited
            ? String(r.date_edited)
            : r.date_created
              ? String(r.date_created)
              : undefined,
        }));
    } catch (error) {
      logger.error("2GIS reviews fetch failed", {
        endpoint: "TwoGisService.fetchReviews",
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * All-in-one: search venue + fetch reviews.
   * Returns both venue info and reviews, or null if not found.
   */
  static async getVenueWithReviews(
    name: string,
    lat: number,
    lng: number,
    cityName: string,
    reviewLimit = 20,
  ): Promise<{ venue: TwoGisVenueInfo; reviews: TwoGisReview[] } | null> {
    const venue = await this.searchVenue(name, lat, lng, cityName);
    if (!venue) return null;

    const reviews = await this.fetchReviews(venue.twoGisId, reviewLimit);
    return { venue, reviews };
  }

  // ============================================
  // Private helpers
  // ============================================

  private static findBestMatch(
    items: Record<string, unknown>[],
    name: string,
    lat: number,
    lng: number,
  ): Record<string, unknown> | null {
    const normalizedName = name.toLowerCase().trim();

    let bestItem: Record<string, unknown> | null = null;
    let bestScore = -1;

    for (const item of items) {
      const itemName = String(item.name || "").toLowerCase().trim();

      // Name similarity score (0-1)
      let nameSim = 0;
      if (itemName === normalizedName) {
        nameSim = 1;
      } else if (
        itemName.includes(normalizedName) ||
        normalizedName.includes(itemName)
      ) {
        nameSim = 0.7;
      } else {
        // Count common words
        const words1 = normalizedName.split(/\s+/);
        const words2 = itemName.split(/\s+/);
        const common = words1.filter((w) => words2.includes(w)).length;
        nameSim = common / Math.max(words1.length, words2.length);
      }

      // Distance penalty
      const point = item.point as { lat?: number; lon?: number } | undefined;
      let distPenalty = 0;
      if (point?.lat && point?.lon) {
        const dist = this.haversine(lat, lng, point.lat, point.lon);
        distPenalty = Math.min(0.3, dist / 5000); // max 0.3 penalty for 5km+
      }

      const score = nameSim - distPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    // Require minimum match quality
    return bestScore >= 0.3 ? bestItem : null;
  }

  private static parseVenueItem(
    item: Record<string, unknown>,
  ): TwoGisVenueInfo {
    const point = item.point as { lat?: number; lon?: number } | undefined;
    const address = item.address_name
      ? String(item.address_name)
      : item.full_address_name
        ? String(item.full_address_name)
        : "";

    // Parse phone
    let phone: string | null = null;
    const contactGroups = item.contact_groups as
      | { contacts: { type: string; value: string }[] }[]
      | undefined;
    if (contactGroups && contactGroups.length > 0) {
      const phoneContact = contactGroups[0]?.contacts?.find(
        (c) => c.type === "phone",
      );
      if (phoneContact) phone = phoneContact.value;
    }

    // Parse working hours
    let workingHours: Record<string, string> | null = null;
    const schedule = item.schedule as
      | { Mon?: string; Tue?: string; Wed?: string; Thu?: string; Fri?: string; Sat?: string; Sun?: string }
      | undefined;
    if (schedule) {
      workingHours = {};
      const dayMap: Record<string, string> = {
        Mon: "пн", Tue: "вт", Wed: "ср", Thu: "чт",
        Fri: "пт", Sat: "сб", Sun: "вс",
      };
      for (const [eng, rus] of Object.entries(dayMap)) {
        const val = (schedule as Record<string, unknown>)[eng];
        if (val && typeof val === "object" && val !== null) {
          const working = val as { working_hours?: { from: string; to: string }[] };
          if (working.working_hours && working.working_hours.length > 0) {
            const wh = working.working_hours[0];
            workingHours[rus] = `${wh.from}–${wh.to}`;
          }
        }
      }
      if (Object.keys(workingHours).length === 0) workingHours = null;
    }

    // Parse rating
    const reviews = item.reviews as { general_rating?: number; general_review_count?: number } | undefined;

    return {
      twoGisId: String(item.id || ""),
      name: String(item.name || ""),
      address,
      phone,
      workingHours,
      rating: reviews?.general_rating ?? null,
      reviewCount: reviews?.general_review_count ?? 0,
      lat: point?.lat ?? 0,
      lng: point?.lon ?? 0,
    };
  }

  private static haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

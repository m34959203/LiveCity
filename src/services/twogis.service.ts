import { logger } from "@/lib/logger";

/**
 * TwoGisService — own 2GIS parser, replaces Apify dependency.
 *
 * Uses public 2GIS APIs:
 *   - Catalog API: search venues, get full details
 *   - Reviews API: fetch actual review text + ratings
 *
 * No API key required — these are public endpoints.
 *
 * Extracted data (matching Apify 2GIS Scraper output):
 *   - id, name, address, coordinates, twoGisUrl
 *   - rating, reviewCount
 *   - phone, email, website, socials (whatsapp, vk, telegram, instagram)
 *   - workingHours
 *   - photoUrl (main photo)
 *   - rubrics (categories/subcategories)
 *   - features (Wi-Fi, parking, avg check, delivery, etc.)
 */

// ============================================
// Types
// ============================================

export interface TwoGisVenueInfo {
  twoGisId: string;
  name: string;
  address: string;
  twoGisUrl: string;
  lat: number;
  lng: number;
  // Rating
  rating: number | null;
  reviewCount: number;
  // Contacts
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  instagram: string | null;
  vk: string | null;
  telegram: string | null;
  // Schedule
  workingHours: Record<string, string> | null;
  // Media
  photoUrl: string | null;
  // Classification
  rubrics: string[];
  features: string[];
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

// Domain for building venue URLs
const TWOGIS_DOMAIN = "https://2gis.kz";

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
        `&fields=items.point,items.address,items.schedule,items.contact_groups,` +
        `items.reviews,items.external_content,items.rubrics,items.attribute_groups,` +
        `items.photos,items.links,items.name_ex` +
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

      let nameSim = 0;
      if (itemName === normalizedName) {
        nameSim = 1;
      } else if (
        itemName.includes(normalizedName) ||
        normalizedName.includes(itemName)
      ) {
        nameSim = 0.7;
      } else {
        const words1 = normalizedName.split(/\s+/);
        const words2 = itemName.split(/\s+/);
        const common = words1.filter((w) => words2.includes(w)).length;
        nameSim = common / Math.max(words1.length, words2.length);
      }

      const point = item.point as { lat?: number; lon?: number } | undefined;
      let distPenalty = 0;
      if (point?.lat && point?.lon) {
        const dist = this.haversine(lat, lng, point.lat, point.lon);
        distPenalty = Math.min(0.3, dist / 5000);
      }

      const score = nameSim - distPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    return bestScore >= 0.3 ? bestItem : null;
  }

  private static parseVenueItem(
    item: Record<string, unknown>,
  ): TwoGisVenueInfo {
    const point = item.point as { lat?: number; lon?: number } | undefined;
    const twoGisId = String(item.id || "");

    // Address
    const address = item.address_name
      ? String(item.address_name)
      : item.full_address_name
        ? String(item.full_address_name)
        : "";

    // URL
    const twoGisUrl = `${TWOGIS_DOMAIN}/firm/${twoGisId}`;

    // ---- Contacts ----
    let phone: string | null = null;
    let email: string | null = null;
    let website: string | null = null;
    let whatsapp: string | null = null;
    let instagram: string | null = null;
    let vk: string | null = null;
    let telegram: string | null = null;

    const contactGroups = item.contact_groups as
      | { contacts: { type: string; value: string; url?: string; text?: string }[] }[]
      | undefined;

    if (contactGroups) {
      for (const group of contactGroups) {
        if (!group.contacts) continue;
        for (const c of group.contacts) {
          switch (c.type) {
            case "phone":
              if (!phone) phone = c.value;
              break;
            case "email":
              if (!email) email = c.value;
              break;
            case "website":
              if (!website) website = c.url || c.value;
              break;
            case "whatsapp":
              if (!whatsapp) whatsapp = c.value;
              break;
            case "instagram":
              if (!instagram) instagram = c.value || c.text || null;
              break;
            case "vkontakte":
              if (!vk) vk = c.url || c.value;
              break;
            case "telegram":
              if (!telegram) telegram = c.url || c.value;
              break;
          }
        }
      }
    }

    // ---- Working hours ----
    let workingHours: Record<string, string> | null = null;
    const schedule = item.schedule as Record<string, unknown> | undefined;
    if (schedule) {
      workingHours = {};
      const dayMap: Record<string, string> = {
        Mon: "пн", Tue: "вт", Wed: "ср", Thu: "чт",
        Fri: "пт", Sat: "сб", Sun: "вс",
      };
      for (const [eng, rus] of Object.entries(dayMap)) {
        const val = schedule[eng];
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

    // ---- Rating ----
    const reviews = item.reviews as
      | { general_rating?: number; general_review_count?: number }
      | undefined;

    // ---- Photo ----
    let photoUrl: string | null = null;
    const externalContent = item.external_content as
      | { main_photo_url?: string }[]
      | undefined;
    if (externalContent && externalContent.length > 0) {
      photoUrl = externalContent[0].main_photo_url || null;
    }
    if (!photoUrl) {
      const photos = item.photos as { url?: string }[] | undefined;
      if (photos && photos.length > 0) {
        photoUrl = photos[0].url || null;
      }
    }

    // ---- Rubrics (categories) ----
    const rubrics: string[] = [];
    const rubricList = item.rubrics as { name?: string }[] | undefined;
    if (rubricList) {
      for (const r of rubricList) {
        if (r.name) rubrics.push(r.name);
      }
    }

    // ---- Features (from attribute_groups) ----
    const features: string[] = [];
    const attrGroups = item.attribute_groups as
      | { rubric_name?: string; attributes?: { name?: string; tag?: string }[] }[]
      | undefined;
    if (attrGroups) {
      for (const group of attrGroups) {
        if (!group.attributes) continue;
        for (const attr of group.attributes) {
          if (attr.name) features.push(attr.name);
        }
      }
    }

    return {
      twoGisId,
      name: String(item.name || ""),
      address,
      twoGisUrl,
      lat: point?.lat ?? 0,
      lng: point?.lon ?? 0,
      rating: reviews?.general_rating ?? null,
      reviewCount: reviews?.general_review_count ?? 0,
      phone,
      email,
      website,
      whatsapp,
      instagram,
      vk,
      telegram,
      workingHours,
      photoUrl,
      rubrics,
      features,
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

import { logger } from "./logger";

// ============================================
// Google Places API Client
// ============================================
// Uses the Places API (legacy) for:
// - Find Place From Text → resolve venue name to placeId
// - Place Details → fetch reviews, rating, total reviews
//
// API key: https://console.cloud.google.com/apis/credentials
// Enable: "Places API" in Google Cloud Console
// Free tier: $200/month credit (~11,700 detail requests)
// ============================================

const BASE_URL = "https://maps.googleapis.com/maps/api/place";

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number; // unix timestamp
  language: string;
  relative_time_description: string;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  reviews: GoogleReview[];
}

export class GooglePlacesClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || "";
  }

  /** Check if API key is configured */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Find Google Place ID by venue name + coordinates.
   * Uses Find Place From Text with location bias.
   */
  async findPlaceId(
    name: string,
    lat: number,
    lng: number,
  ): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        input: name,
        inputtype: "textquery",
        locationbias: `circle:1000@${lat},${lng}`,
        fields: "place_id,name",
        key: this.apiKey,
      });

      const res = await fetch(
        `${BASE_URL}/findplacefromtext/json?${params}`,
        { signal: AbortSignal.timeout(10_000) },
      );

      if (!res.ok) {
        logger.error("Google Places findPlace HTTP error", {
          endpoint: "GooglePlacesClient.findPlaceId",
          error: `${res.status} ${res.statusText}`,
        });
        return null;
      }

      const data = await res.json();

      if (data.status !== "OK" || !data.candidates?.length) {
        logger.warn("Google Places findPlace: no candidates", {
          endpoint: "GooglePlacesClient.findPlaceId",
          error: `status=${data.status}, query="${name}"`,
        });
        return null;
      }

      return data.candidates[0].place_id;
    } catch (error) {
      logger.error("Google Places findPlace failed", {
        endpoint: "GooglePlacesClient.findPlaceId",
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Fetch place details: reviews, rating, total review count.
   * Returns up to 5 most recent reviews (Google API limit).
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const params = new URLSearchParams({
        place_id: placeId,
        fields: "place_id,name,rating,user_ratings_total,reviews",
        language: "ru",
        key: this.apiKey,
      });

      const res = await fetch(
        `${BASE_URL}/details/json?${params}`,
        { signal: AbortSignal.timeout(10_000) },
      );

      if (!res.ok) {
        logger.error("Google Places details HTTP error", {
          endpoint: "GooglePlacesClient.getPlaceDetails",
          error: `${res.status} ${res.statusText}`,
        });
        return null;
      }

      const data = await res.json();

      if (data.status !== "OK" || !data.result) {
        logger.warn("Google Places details: bad status", {
          endpoint: "GooglePlacesClient.getPlaceDetails",
          error: `status=${data.status}, placeId=${placeId}`,
        });
        return null;
      }

      const r = data.result;
      return {
        place_id: r.place_id ?? placeId,
        name: r.name ?? "",
        rating: r.rating ?? 0,
        user_ratings_total: r.user_ratings_total ?? 0,
        reviews: (r.reviews ?? []).map((rev: Record<string, unknown>) => ({
          author_name: (rev.author_name as string) ?? "Anonymous",
          rating: (rev.rating as number) ?? 0,
          text: (rev.text as string) ?? "",
          time: (rev.time as number) ?? 0,
          language: (rev.language as string) ?? "ru",
          relative_time_description:
            (rev.relative_time_description as string) ?? "",
        })),
      };
    } catch (error) {
      logger.error("Google Places details failed", {
        endpoint: "GooglePlacesClient.getPlaceDetails",
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

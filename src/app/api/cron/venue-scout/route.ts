import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GooglePlacesClient, type TextSearchResult } from "@/lib/google-places";
import { Apify2GisClient, type TwoGisPlace } from "@/lib/apify-2gis";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/venue-scout
 *
 * CITY RADAR — Automatic venue discovery.
 * Runs weekly (Sunday night) via external cron trigger.
 *
 * Sources:
 *   1. Google Places API Text Search — discover by category queries
 *   2. Apify 2GIS Places Scraper — discover from 2GIS catalog
 *
 * Pipeline:
 *   1. For each city, run search queries across categories
 *   2. Collect all place_ids / names
 *   3. Cross-reference with existing venues in DB
 *   4. Create new venues with appropriate category mapping
 *   5. New venues are picked up by sync-pulse for AI analysis
 *
 * Auth: Bearer CRON_SECRET
 */

// --- City configurations ---
const CITIES = [
  {
    name: "Алматы",
    lat: 43.238,
    lng: 76.945,
    radius: 8000,
  },
  {
    name: "Астана",
    lat: 51.1694,
    lng: 71.4491,
    radius: 8000,
  },
];

// --- Search queries per category ---
const CATEGORY_QUERIES = [
  { query: "рестораны", categorySlug: "restaurant" },
  { query: "кафе кофейни", categorySlug: "cafe" },
  { query: "бары пабы", categorySlug: "bar" },
  { query: "парки скверы", categorySlug: "park" },
  { query: "торговые центры моллы", categorySlug: "mall" },
  { query: "развлечения боулинг кинотеатр", categorySlug: "entertainment" },
];

// Google Places types → our category slug mapping
const GOOGLE_TYPE_TO_CATEGORY: Record<string, string> = {
  restaurant: "restaurant",
  cafe: "cafe",
  bar: "bar",
  night_club: "bar",
  park: "park",
  shopping_mall: "mall",
  amusement_park: "entertainment",
  movie_theater: "entertainment",
  bowling_alley: "entertainment",
};

// 2GIS category keywords → our category slug
const TWOGIS_CATEGORY_MAP: [RegExp, string][] = [
  [/ресторан/i, "restaurant"],
  [/кафе|кофейн/i, "cafe"],
  [/бар|паб/i, "bar"],
  [/парк|сквер/i, "park"],
  [/торгов|молл|трц/i, "mall"],
  [/развлеч|кинотеатр|боулинг/i, "entertainment"],
];

const googleClient = new GooglePlacesClient();
const twoGisClient = new Apify2GisClient();

export async function POST(request: NextRequest) {
  // --- Auth ---
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 },
    );
  }

  const googleConfigured = googleClient.isConfigured();
  const twoGisConfigured = twoGisClient.isConfigured();

  if (!googleConfigured && !twoGisConfigured) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_CONFIGURED",
          message:
            "Neither GOOGLE_PLACES_API_KEY nor APIFY_TOKEN+APIFY_2GIS_PLACES_ACTOR configured",
        },
      },
      { status: 503 },
    );
  }

  const startTime = Date.now();

  try {
    // --- Load existing googlePlaceIds for dedup ---
    const existingVenues = await prisma.venue.findMany({
      select: { googlePlaceId: true, name: true },
    });
    const existingPlaceIds = new Set(
      existingVenues
        .map((v) => v.googlePlaceId)
        .filter((id): id is string => !!id),
    );
    const existingNames = new Set(
      existingVenues.map((v) => v.name.toLowerCase()),
    );

    // --- Load categories from DB ---
    const categories = await prisma.category.findMany();
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

    let totalDiscovered = 0;
    let totalNew = 0;
    const errors: string[] = [];

    // --- Process each city ---
    for (const city of CITIES) {
      logger.info(`venue-scout: scanning ${city.name}`, {
        endpoint: "/api/cron/venue-scout",
      });

      // Collect discovered places from both sources
      const discoveredPlaces: DiscoveredPlace[] = [];

      // --- Source 1: Google Places Text Search ---
      if (googleConfigured) {
        for (const cq of CATEGORY_QUERIES) {
          try {
            const results = await googleClient.textSearch(
              `${cq.query} ${city.name}`,
              city.lat,
              city.lng,
              city.radius,
            );

            for (const r of results) {
              discoveredPlaces.push(
                googleResultToDiscovered(r, cq.categorySlug),
              );
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            errors.push(`Google/${cq.query}/${city.name}: ${msg}`);
          }

          // Small delay to avoid rate limits
          await sleep(200);
        }
      }

      // --- Source 2: Apify 2GIS Places Scraper ---
      if (twoGisConfigured) {
        for (const cq of CATEGORY_QUERIES) {
          try {
            const places = await twoGisClient.searchPlaces(
              cq.query,
              city.name,
              20,
            );

            for (const p of places) {
              discoveredPlaces.push(
                twoGisResultToDiscovered(p, cq.categorySlug),
              );
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            errors.push(`2GIS/${cq.query}/${city.name}: ${msg}`);
          }
        }
      }

      totalDiscovered += discoveredPlaces.length;

      // --- Deduplicate and create new venues ---
      const seen = new Set<string>();

      for (const place of discoveredPlaces) {
        // Skip if already in DB by googlePlaceId
        if (place.googlePlaceId && existingPlaceIds.has(place.googlePlaceId)) {
          continue;
        }

        // Skip if already in DB by name (fuzzy)
        if (existingNames.has(place.name.toLowerCase())) {
          continue;
        }

        // Skip duplicates within this batch
        const dedupeKey = place.googlePlaceId || place.name.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        // Resolve category ID
        const categoryId = categoryBySlug.get(place.categorySlug);
        if (!categoryId) continue;

        try {
          const slug = generateSlug(place.name);

          // Check slug uniqueness
          const existing = await prisma.venue.findUnique({
            where: { slug },
            select: { id: true },
          });
          if (existing) continue;

          await prisma.venue.create({
            data: {
              name: place.name,
              slug,
              address: place.address,
              latitude: place.latitude,
              longitude: place.longitude,
              googlePlaceId: place.googlePlaceId || null,
              twoGisUrl: place.twoGisUrl || null,
              phone: place.phone || null,
              categoryId,
              liveScore: 0,
              isActive: true,
            },
          });

          // Track for dedup within this run
          if (place.googlePlaceId) {
            existingPlaceIds.add(place.googlePlaceId);
          }
          existingNames.add(place.name.toLowerCase());
          totalNew++;

          logger.info(`venue-scout: NEW "${place.name}" (${place.categorySlug})`, {
            endpoint: "/api/cron/venue-scout",
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          // Skip duplicate slug errors gracefully
          if (msg.includes("Unique constraint")) continue;
          errors.push(`Create ${place.name}: ${msg}`);
        }
      }
    }

    const elapsed = Date.now() - startTime;

    logger.info(
      `venue-scout: done. ${totalDiscovered} discovered, ${totalNew} new venues, ${elapsed}ms`,
      { endpoint: "/api/cron/venue-scout" },
    );

    return NextResponse.json({
      data: {
        totalDiscovered,
        totalNew,
        cities: CITIES.map((c) => c.name),
        sources: {
          google: googleConfigured,
          twoGis: twoGisConfigured,
        },
        errors: errors.length > 0 ? errors : undefined,
        elapsedMs: elapsed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("venue-scout: pipeline error", {
      endpoint: "/api/cron/venue-scout",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: {
          code: "PIPELINE_ERROR",
          message: "Venue discovery pipeline failed",
        },
      },
      { status: 500 },
    );
  }
}

// ============================================
// HELPERS
// ============================================

interface DiscoveredPlace {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  categorySlug: string;
  googlePlaceId?: string;
  twoGisUrl?: string;
  phone?: string;
}

/** Convert Google Text Search result to unified format */
function googleResultToDiscovered(
  r: TextSearchResult,
  fallbackCategory: string,
): DiscoveredPlace {
  // Try to map Google types to our categories
  let categorySlug = fallbackCategory;
  for (const type of r.types) {
    if (GOOGLE_TYPE_TO_CATEGORY[type]) {
      categorySlug = GOOGLE_TYPE_TO_CATEGORY[type];
      break;
    }
  }

  return {
    name: r.name,
    address: r.formatted_address,
    latitude: r.latitude,
    longitude: r.longitude,
    categorySlug,
    googlePlaceId: r.place_id,
  };
}

/** Convert 2GIS result to unified format */
function twoGisResultToDiscovered(
  p: TwoGisPlace,
  fallbackCategory: string,
): DiscoveredPlace {
  let categorySlug = fallbackCategory;
  if (p.category) {
    for (const [regex, slug] of TWOGIS_CATEGORY_MAP) {
      if (regex.test(p.category)) {
        categorySlug = slug;
        break;
      }
    }
  }

  return {
    name: p.name,
    address: p.address,
    latitude: p.latitude,
    longitude: p.longitude,
    categorySlug,
    twoGisUrl: p.url,
    phone: p.phone,
  };
}

/** Transliterate Russian text and generate URL-safe slug */
function generateSlug(name: string): string {
  const translitMap: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  const slug = name
    .toLowerCase()
    .split("")
    .map((ch) => translitMap[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

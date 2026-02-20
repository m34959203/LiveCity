import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OverpassClient } from "@/lib/overpass-osm";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/venue-scout
 *
 * CITY RADAR — Automatic venue discovery via OpenStreetMap.
 * Runs weekly (Sunday night) via external cron trigger.
 *
 * Source: OpenStreetMap Overpass API (free, no API key)
 *
 * Pipeline:
 *   1. For each city, fetch all venue types in ONE Overpass query
 *   2. Collect all discovered places
 *   3. Cross-reference with existing venues in DB
 *   4. Create new venues with appropriate category mapping
 *   5. New venues are picked up by sync-pulse for AI analysis
 *
 * Auth: Bearer CRON_SECRET
 */

// --- City configurations (5 KZ cities) ---
const CITIES = [
  { name: "Алматы", lat: 43.222, lng: 76.8512, radiusKm: 8 },
  { name: "Астана", lat: 51.1694, lng: 71.4491, radiusKm: 8 },
  { name: "Шымкент", lat: 42.3417, lng: 69.5967, radiusKm: 7 },
  { name: "Караганда", lat: 49.8047, lng: 73.1094, radiusKm: 7 },
  { name: "Жезказган", lat: 47.7833, lng: 67.7144, radiusKm: 6 },
];

const overpassClient = new OverpassClient();

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

  const startTime = Date.now();

  try {
    // --- Load existing venues for dedup ---
    const existingVenues = await prisma.venue.findMany({
      select: { name: true, twoGisUrl: true },
    });
    const existingNames = new Set(
      existingVenues.map((v) => v.name.toLowerCase()),
    );

    // --- Load categories from DB ---
    const categories = await prisma.category.findMany();
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

    let totalDiscovered = 0;
    let totalNew = 0;
    const errors: string[] = [];

    // --- Process each city (1 Overpass query per city) ---
    for (const city of CITIES) {
      logger.info(`venue-scout: scanning ${city.name}`, {
        endpoint: "/api/cron/venue-scout",
      });

      try {
        const places = await overpassClient.discoverAll(
          city.lat,
          city.lng,
          city.radiusKm,
          city.name,
        );

        logger.info(
          `venue-scout: ${city.name} — ${places.length} venues from OSM`,
          { endpoint: "/api/cron/venue-scout" },
        );

        totalDiscovered += places.length;

        // --- Deduplicate and create new venues ---
        const seen = new Set<string>();

        for (const place of places) {
          // Skip if already in DB by name
          if (existingNames.has(place.name.toLowerCase())) continue;

          // Skip duplicates within this batch
          const dedupeKey = place.osmId || place.name.toLowerCase();
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

            // Initial score: category baseline + unique variation per venue
            const initialScore = variedScore(
              place.categorySlug, place.name, place.latitude, place.longitude,
            );

            await prisma.venue.create({
              data: {
                name: place.name,
                slug,
                address: place.address,
                latitude: place.latitude,
                longitude: place.longitude,
                phone: place.phone || null,
                categoryId,
                liveScore: initialScore,
                isActive: true,
              },
            });

            existingNames.add(place.name.toLowerCase());
            totalNew++;

            logger.info(
              `venue-scout: NEW "${place.name}" (${place.categorySlug})`,
              { endpoint: "/api/cron/venue-scout" },
            );
          } catch (error) {
            const msg =
              error instanceof Error ? error.message : String(error);
            if (msg.includes("Unique constraint")) continue;
            errors.push(`Create ${place.name}: ${msg}`);
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`OSM/${city.name}: ${msg}`);
      }

      // Pause between cities (Overpass rate-limit courtesy)
      await sleep(2000);
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
        sources: { osm: true },
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

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Varied initial score: category baseline + deterministic per-venue variation */
function variedScore(
  categorySlug: string, name: string, lat: number, lng: number,
): number {
  const baselines: Record<string, number> = {
    restaurant: 5.5, cafe: 5.0, bar: 4.5,
    park: 6.0, mall: 5.5, entertainment: 5.0,
  };
  const base = baselines[categorySlug] ?? 4.5;
  // Deterministic hash → variation ±1.0
  let hash = 0;
  const input = `${name}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  const variation = (hash % 200) / 100;
  return Math.round(Math.max(2, Math.min(9, base + variation)) * 10) / 10;
}

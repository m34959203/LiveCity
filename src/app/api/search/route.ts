import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/services/ai.service";
import { VenueService } from "@/services/venue.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { OverpassClient } from "@/lib/overpass-osm";
import { CITIES } from "@/lib/cities";
import { prisma } from "@/lib/prisma";

// ============================================
// POST /api/search — AI-powered semantic search
// with Lazy Discovery fallback via OpenStreetMap
// ============================================
// Flow:
//   1. Search our DB via AI (Gemini semantic ranking)
//   2. If no results → Lazy Discovery:
//      a. OSM Overpass search for matching venues
//      b. Auto-create found venue in DB
//      c. Return to user (sync-pulse picks it up later)
// ============================================

const overpassClient = new OverpassClient();

// Default city for Lazy Discovery (configurable via env)
const DEFAULT_CITY = process.env.DEFAULT_CITY || "Алматы";

export async function POST(request: NextRequest) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = await request.json();
    const { query, city: cityName, location, limit = 5 } = body;
    const searchCity =
      typeof cityName === "string" && cityName.trim()
        ? cityName.trim()
        : DEFAULT_CITY;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "Запрос слишком короткий. Опишите, что вы ищете.",
          },
        },
        { status: 400 },
      );
    }

    // Load venues for AI context — filtered by city to avoid global bias
    const cityConfig = CITIES.find((c) => c.name === searchCity);
    const radiusKm = 15; // generous radius to capture entire city area

    const cityBounds = cityConfig
      ? {
          swLat: cityConfig.lat - radiusKm / 111,
          neLat: cityConfig.lat + radiusKm / 111,
          swLng: cityConfig.lng - radiusKm / (111 * Math.cos((cityConfig.lat * Math.PI) / 180)),
          neLng: cityConfig.lng + radiusKm / (111 * Math.cos((cityConfig.lat * Math.PI) / 180)),
        }
      : undefined;

    const { data: venues } = await VenueService.getAll({
      bounds: cityBounds,
      limit: 100,
    });

    // AI search
    const aiResult = await AIService.semanticSearch(
      query.trim(),
      venues,
      location,
      searchCity,
    );

    // Enrich results with full venue data
    const venueMap = new Map(venues.map((v) => [v.id, v]));
    const enrichedResults = aiResult.results
      .slice(0, limit)
      .map((r) => {
        const venue = venueMap.get(r.venueId);
        if (!venue) return null;
        return {
          venue,
          relevance: r.relevance,
          reason: r.reason,
        };
      })
      .filter(Boolean);

    // --- Lazy Discovery via OpenStreetMap ---
    // If AI search found nothing relevant, try discovering via Overpass
    if (enrichedResults.length === 0 && cityConfig) {
      logger.info(
        `Lazy Discovery: no DB results for "${query}", searching OSM`,
        { endpoint: "/api/search" },
      );

      const osmResults = await overpassClient.search(
        query.trim(),
        cityConfig.lat,
        cityConfig.lng,
        8,
        10,
        cityConfig.name,
      );

      // Create up to 5 new venues from OSM
      const discoveredVenues: Array<{
        venue: Record<string, unknown>;
        relevance: number;
        reason: string;
      }> = [];

      for (const discovered of osmResults.slice(0, 5)) {
        try {
          // Check if already exists by name
          const existing = await prisma.venue.findFirst({
            where: {
              name: { equals: discovered.name, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (existing) continue;

          const category = await prisma.category.findUnique({
            where: { slug: discovered.categorySlug },
          });
          if (!category) continue;

          const slug = generateSlug(discovered.name);
          const initialScore = variedScore(
            discovered.categorySlug, discovered.name,
            discovered.latitude, discovered.longitude,
          );

          const newVenue = await prisma.venue.create({
            data: {
              name: discovered.name,
              slug,
              address: discovered.address,
              latitude: discovered.latitude,
              longitude: discovered.longitude,
              phone: discovered.phone || null,
              categoryId: category.id,
              liveScore: initialScore,
              isActive: true,
            },
            include: {
              category: true,
              tags: { include: { tag: true } },
            },
          });

          logger.info(
            `Lazy Discovery: created "${discovered.name}" (${discovered.categorySlug}) via OSM`,
            { endpoint: "/api/search" },
          );

          discoveredVenues.push({
            venue: {
              id: newVenue.id,
              name: newVenue.name,
              slug: newVenue.slug,
              category: {
                slug: newVenue.category.slug,
                name: newVenue.category.name,
                icon: newVenue.category.icon,
                color: newVenue.category.color,
              },
              address: newVenue.address,
              latitude: newVenue.latitude,
              longitude: newVenue.longitude,
              liveScore: newVenue.liveScore,
              photoUrls: newVenue.photoUrls,
              tags: newVenue.tags.map((vt: { tag: { slug: string } }) => vt.tag.slug),
              isActive: newVenue.isActive,
            },
            relevance: 0.7,
            reason: "Найдено через OpenStreetMap и добавлено в LiveCity.",
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (!msg.includes("Unique constraint")) {
            logger.error("Lazy Discovery: create failed", {
              endpoint: "/api/search",
              error: msg,
            });
          }
        }
      }

      if (discoveredVenues.length > 0) {
        return NextResponse.json({
          data: {
            results: discoveredVenues,
            interpretation: `Найдено ${discoveredVenues.length} новых мест через OpenStreetMap по запросу "${query}".`,
            totalFound: discoveredVenues.length,
            discovered: true,
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        results: enrichedResults,
        interpretation: aiResult.interpretation,
        totalFound: enrichedResults.length,
      },
    });
  } catch (error) {
    logger.error("POST /api/search failed", {
      endpoint: "/api/search",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

// ============================================
// Helpers
// ============================================

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

/** Varied initial score: category baseline + deterministic per-venue variation */
function variedScore(
  categorySlug: string, name: string, lat: number, lng: number,
): number {
  const baselines: Record<string, number> = {
    restaurant: 5.5, cafe: 5.0, bar: 4.5,
    park: 6.0, mall: 5.5, entertainment: 5.0,
  };
  const base = baselines[categorySlug] ?? 4.5;
  let hash = 0;
  const input = `${name}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  const variation = (hash % 200) / 100;
  return Math.round(Math.max(2, Math.min(9, base + variation)) * 10) / 10;
}

import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/services/ai.service";
import { VenueService } from "@/services/venue.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { GooglePlacesClient } from "@/lib/google-places";
import { prisma } from "@/lib/prisma";

// ============================================
// POST /api/search — AI-powered semantic search
// with Lazy Discovery fallback
// ============================================
// Flow:
//   1. Search our DB via AI (Gemini semantic ranking)
//   2. If no results → Lazy Discovery:
//      a. Google Places Text Search for the query
//      b. Auto-create found venue in DB
//      c. Return to user (sync-pulse picks it up later)
// ============================================

const googleClient = new GooglePlacesClient();

// Default coordinates for Lazy Discovery search (Almaty center)
const DEFAULT_LAT = 43.238;
const DEFAULT_LNG = 76.945;

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
    const { query, location, limit = 5 } = body;

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

    // Load venues for AI context
    const { data: venues } = await VenueService.getAll({ limit: 100 });

    // AI search
    const aiResult = await AIService.semanticSearch(
      query.trim(),
      venues,
      location,
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

    // --- Lazy Discovery ---
    // If AI search found nothing relevant, try discovering via Google Places
    if (enrichedResults.length === 0 && googleClient.isConfigured()) {
      logger.info(`Lazy Discovery: no DB results for "${query}", searching Google`, {
        endpoint: "/api/search",
      });

      const lat = location?.latitude ?? DEFAULT_LAT;
      const lng = location?.longitude ?? DEFAULT_LNG;

      const googleResults = await googleClient.textSearch(
        query.trim(),
        lat,
        lng,
        5000,
      );

      if (googleResults.length > 0) {
        // Take the top result and auto-create in our DB
        const discovered = googleResults[0];

        // Check if already exists by googlePlaceId
        const existing = await prisma.venue.findFirst({
          where: { googlePlaceId: discovered.place_id },
          select: { id: true },
        });

        if (!existing) {
          // Resolve category from Google types
          const categorySlug = resolveCategory(discovered.types);
          const category = await prisma.category.findUnique({
            where: { slug: categorySlug },
          });

          if (category) {
            const slug = generateSlug(discovered.name);

            try {
              const newVenue = await prisma.venue.create({
                data: {
                  name: discovered.name,
                  slug,
                  address: discovered.formatted_address,
                  latitude: discovered.latitude,
                  longitude: discovered.longitude,
                  googlePlaceId: discovered.place_id,
                  categoryId: category.id,
                  liveScore: 0,
                  isActive: true,
                },
                include: {
                  category: true,
                  tags: { include: { tag: true } },
                },
              });

              logger.info(
                `Lazy Discovery: created "${discovered.name}" (${categorySlug})`,
                { endpoint: "/api/search" },
              );

              // Return the newly created venue as a discovery result
              return NextResponse.json({
                data: {
                  results: [
                    {
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
                        tags: newVenue.tags.map((vt) => vt.tag.slug),
                        isActive: newVenue.isActive,
                      },
                      relevance: 0.8,
                      reason: "Найдено через Google Places. Данные обновятся после первого анализа.",
                    },
                  ],
                  interpretation: `Мы нашли "${discovered.name}" через Google и добавили в LiveCity. Скоро появится AI-анализ отзывов.`,
                  totalFound: 1,
                  discovered: true,
                },
              });
            } catch (error) {
              // Slug collision — venue might already exist under different name
              const msg = error instanceof Error ? error.message : String(error);
              if (!msg.includes("Unique constraint")) {
                logger.error("Lazy Discovery: create failed", {
                  endpoint: "/api/search",
                  error: msg,
                });
              }
            }
          }
        }
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
// Lazy Discovery helpers
// ============================================

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

function resolveCategory(types: string[]): string {
  for (const type of types) {
    if (GOOGLE_TYPE_TO_CATEGORY[type]) {
      return GOOGLE_TYPE_TO_CATEGORY[type];
    }
  }
  return "cafe"; // default fallback
}

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

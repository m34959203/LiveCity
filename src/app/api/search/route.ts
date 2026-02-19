import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/services/ai.service";
import { VenueService } from "@/services/venue.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { Apify2GisClient } from "@/lib/apify-2gis";
import { prisma } from "@/lib/prisma";

// ============================================
// POST /api/search — AI-powered semantic search
// with Lazy Discovery fallback via 2GIS
// ============================================
// Flow:
//   1. Search our DB via AI (Gemini semantic ranking)
//   2. If no results → Lazy Discovery:
//      a. 2GIS Places Search for the query
//      b. Auto-create found venue in DB
//      c. Return to user (sync-pulse picks it up later)
// ============================================

const twoGisClient = new Apify2GisClient();

// 2GIS category keywords → our category slug
const TWOGIS_CATEGORY_MAP: [RegExp, string][] = [
  [/ресторан/i, "restaurant"],
  [/кафе|кофейн/i, "cafe"],
  [/бар|паб/i, "bar"],
  [/парк|сквер/i, "park"],
  [/торгов|молл|трц/i, "mall"],
  [/развлеч|кинотеатр|боулинг/i, "entertainment"],
];

// Default city for Lazy Discovery (Жезказган)
const DEFAULT_CITY = "Жезказган";

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

    // --- Lazy Discovery via 2GIS ---
    // If AI search found nothing relevant, try discovering via 2GIS
    if (enrichedResults.length === 0 && twoGisClient.isConfigured()) {
      logger.info(`Lazy Discovery: no DB results for "${query}", searching 2GIS`, {
        endpoint: "/api/search",
      });

      const twoGisResults = await twoGisClient.searchPlaces(
        query.trim(),
        DEFAULT_CITY,
        5,
      );

      if (twoGisResults.length > 0) {
        // Take the top result and auto-create in our DB
        const discovered = twoGisResults[0];

        // Check if already exists by name (fuzzy)
        const existing = await prisma.venue.findFirst({
          where: {
            name: { equals: discovered.name, mode: "insensitive" },
          },
          select: { id: true },
        });

        if (!existing) {
          // Resolve category from 2GIS category string
          const categorySlug = resolve2GisCategory(discovered.category);
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
                  address: discovered.address,
                  latitude: discovered.latitude,
                  longitude: discovered.longitude,
                  twoGisUrl: discovered.url || null,
                  phone: discovered.phone || null,
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
                `Lazy Discovery: created "${discovered.name}" (${categorySlug}) via 2GIS`,
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
                      reason: "Найдено через 2GIS. Данные обновятся после первого анализа.",
                    },
                  ],
                  interpretation: `Мы нашли "${discovered.name}" через 2GIS и добавили в LiveCity. Скоро появится AI-анализ отзывов.`,
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

function resolve2GisCategory(category: string): string {
  for (const [regex, slug] of TWOGIS_CATEGORY_MAP) {
    if (regex.test(category)) {
      return slug;
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

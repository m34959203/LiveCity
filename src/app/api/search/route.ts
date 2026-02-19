import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/services/ai.service";
import { VenueService } from "@/services/venue.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

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

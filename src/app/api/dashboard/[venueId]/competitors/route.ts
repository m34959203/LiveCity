import { NextResponse } from "next/server";
import { CompetitorService } from "@/services/competitor.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET /api/dashboard/:venueId/competitors
 *
 * Competitive intelligence: strengths, weaknesses, opportunities
 * vs nearby competitors in the same category.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 20);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { venueId } = await params;
    const data = await CompetitorService.getCompetitorInsights(venueId);

    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Заведение не найдено" } },
        { status: 404 },
      );
    }

    const response = NextResponse.json({ data });
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );
    return response;
  } catch (error) {
    logger.error("GET /api/dashboard/:venueId/competitors failed", {
      endpoint: "/api/dashboard/:venueId/competitors",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

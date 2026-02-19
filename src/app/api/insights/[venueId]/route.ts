import { NextResponse } from "next/server";
import { InsightService } from "@/services/insight.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET /api/insights/:venueId
 *
 * "Trojan Horse" — free insight for any venue.
 * Public, no auth — this is the hook to get businesses on the platform.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { venueId } = await params;
    const data = await InsightService.generateFreeInsight(venueId);

    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Заведение не найдено" } },
        { status: 404 },
      );
    }

    const response = NextResponse.json({ data });
    response.headers.set(
      "Cache-Control",
      "public, max-age=600, stale-while-revalidate=1200",
    );
    return response;
  } catch (error) {
    logger.error("GET /api/insights/:venueId failed", {
      endpoint: "/api/insights/:venueId",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

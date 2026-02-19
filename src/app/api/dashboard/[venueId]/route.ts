import { NextResponse } from "next/server";
import { AnalyticsService } from "@/services/analytics.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 30);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { venueId } = await params;
    const data = await AnalyticsService.getDashboardData(venueId);

    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Заведение не найдено" } },
        { status: 404 },
      );
    }

    const response = NextResponse.json({ data });
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120",
    );
    return response;
  } catch (error) {
    logger.error("GET /api/dashboard/:venueId failed", {
      endpoint: "/api/dashboard/:venueId",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

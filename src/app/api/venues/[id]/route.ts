import { NextResponse } from "next/server";
import { VenueService } from "@/services/venue.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { id } = await params;
    const venue = await VenueService.getById(id);

    if (!venue) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Заведение не найдено" } },
        { status: 404 },
      );
    }

    const response = NextResponse.json({ data: venue });
    response.headers.set(
      "Cache-Control",
      "public, max-age=15, stale-while-revalidate=30",
    );
    return response;
  } catch (error) {
    logger.error("GET /api/venues/:id failed", {
      endpoint: "/api/venues/:id",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { VenueService } from "@/services/venue.service";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import type { VenueFilters } from "@/types/venue";

export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  const { allowed, remaining } = rateLimit(ip, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      {
        status: 429,
        headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" },
      },
    );
  }

  try {
    const { searchParams } = request.nextUrl;

    const filters: VenueFilters = {};

    // Parse bounds: sw_lat,sw_lng,ne_lat,ne_lng
    const boundsStr = searchParams.get("bounds");
    if (boundsStr) {
      const parts = boundsStr.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        filters.bounds = {
          swLat: parts[0],
          swLng: parts[1],
          neLat: parts[2],
          neLng: parts[3],
        };
      }
    }

    const category = searchParams.get("category");
    if (category) filters.category = category;

    const tag = searchParams.get("tag");
    if (tag) filters.tag = tag;

    const minScore = searchParams.get("minScore");
    if (minScore && !isNaN(Number(minScore))) {
      filters.minScore = Number(minScore);
    }

    const limit = searchParams.get("limit");
    if (limit && !isNaN(Number(limit))) {
      filters.limit = Math.min(Number(limit), 200);
    }

    const offset = searchParams.get("offset");
    if (offset && !isNaN(Number(offset))) {
      filters.offset = Number(offset);
    }

    const result = await VenueService.getAll(filters);

    const response = NextResponse.json(result);
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    );
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  } catch (error) {
    logger.error("GET /api/venues failed", {
      endpoint: "/api/venues",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

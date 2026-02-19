import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { searchParams } = request.nextUrl;

    const where: Record<string, unknown> = { isActive: true };

    const boundsStr = searchParams.get("bounds");
    if (boundsStr) {
      const parts = boundsStr.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        where.latitude = { gte: parts[0], lte: parts[2] };
        where.longitude = { gte: parts[1], lte: parts[3] };
      }
    }

    const resolution = searchParams.get("resolution") || "low";
    const precision =
      resolution === "high" ? 4 : resolution === "medium" ? 3 : 2;

    const venues = await prisma.venue.findMany({
      where,
      select: { latitude: true, longitude: true, liveScore: true },
    });

    // Aggregate into grid buckets
    const buckets = new Map<
      string,
      { lat: number; lng: number; totalScore: number; count: number }
    >();

    for (const v of venues) {
      const latKey = v.latitude.toFixed(precision);
      const lngKey = v.longitude.toFixed(precision);
      const key = `${latKey},${lngKey}`;

      const existing = buckets.get(key);
      if (existing) {
        existing.totalScore += v.liveScore;
        existing.count++;
      } else {
        buckets.set(key, {
          lat: parseFloat(latKey),
          lng: parseFloat(lngKey),
          totalScore: v.liveScore,
          count: 1,
        });
      }
    }

    const points = Array.from(buckets.values()).map((b) => ({
      latitude: b.lat,
      longitude: b.lng,
      weight: Math.round((b.totalScore / b.count / 10) * 100) / 100,
      venueCount: b.count,
    }));

    const response = NextResponse.json({ data: { points } });
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120",
    );
    return response;
  } catch (error) {
    logger.error("GET /api/heatmap failed", {
      endpoint: "/api/heatmap",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

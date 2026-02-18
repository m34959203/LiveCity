import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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
    const precision = resolution === "high" ? 4 : resolution === "medium" ? 3 : 2;

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

    return NextResponse.json({ data: { points } });
  } catch (error) {
    console.error("GET /api/heatmap error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

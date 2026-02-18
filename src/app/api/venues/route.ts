import { NextRequest, NextResponse } from "next/server";
import { VenueService } from "@/services/venue.service";
import type { VenueFilters } from "@/types/venue";

export async function GET(request: NextRequest) {
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
    if (minScore) filters.minScore = Number(minScore);

    const limit = searchParams.get("limit");
    if (limit) filters.limit = Math.min(Number(limit), 200);

    const offset = searchParams.get("offset");
    if (offset) filters.offset = Number(offset);

    const result = await VenueService.getAll(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/venues error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

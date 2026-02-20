import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/purge-seed
 *
 * Previously removed old seed/fake venues. Now disabled because
 * OSM-discovered venues don't have googlePlaceId or twoGisUrl,
 * so the old heuristic would delete real data.
 *
 * Auth: Bearer CRON_SECRET
 */

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 },
    );
  }

  logger.info("purge-seed: disabled (OSM venues lack external IDs)", {
    endpoint: "/api/cron/purge-seed",
  });

  return NextResponse.json({
    data: {
      purged: 0,
      message:
        "Purge disabled — OSM-discovered venues don't have external IDs.",
      timestamp: new Date().toISOString(),
    },
  });
}

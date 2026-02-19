import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/purge-seed
 *
 * Removes old seed/fake venues from the database.
 * A venue is considered "seed data" if it has:
 *   - No googlePlaceId (not discovered via Google Places)
 *   - No twoGisUrl (not discovered via 2GIS)
 *
 * Real venues always have at least one external source identifier.
 *
 * Auth: Bearer CRON_SECRET
 */

export async function POST(request: NextRequest) {
  // --- Auth ---
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 },
    );
  }

  try {
    // Find venues that have NO external source identifiers
    // These are remnants of old seed data with fabricated addresses
    const seedVenues = await prisma.venue.findMany({
      where: {
        googlePlaceId: null,
        twoGisUrl: null,
      },
      select: { id: true, name: true, slug: true, createdAt: true },
    });

    if (seedVenues.length === 0) {
      return NextResponse.json({
        data: {
          purged: 0,
          message: "No seed venues found. Database is clean.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const venueIds = seedVenues.map((v) => v.id);

    // Delete related records first (cascading cleanup)
    const [deletedSignals, deletedReviews, deletedScoreHistory, deletedTags] =
      await prisma.$transaction([
        prisma.socialSignal.deleteMany({
          where: { venueId: { in: venueIds } },
        }),
        prisma.review.deleteMany({
          where: { venueId: { in: venueIds } },
        }),
        prisma.scoreHistory.deleteMany({
          where: { venueId: { in: venueIds } },
        }),
        prisma.venueTag.deleteMany({
          where: { venueId: { in: venueIds } },
        }),
      ]);

    // Delete the venues themselves
    const deletedVenues = await prisma.venue.deleteMany({
      where: { id: { in: venueIds } },
    });

    logger.info(
      `purge-seed: removed ${deletedVenues.count} seed venues and related data`,
      { endpoint: "/api/cron/purge-seed" },
    );

    return NextResponse.json({
      data: {
        purged: deletedVenues.count,
        venues: seedVenues.map((v) => ({
          name: v.name,
          slug: v.slug,
          createdAt: v.createdAt,
        })),
        relatedDeleted: {
          socialSignals: deletedSignals.count,
          reviews: deletedReviews.count,
          scoreHistory: deletedScoreHistory.count,
          venueTags: deletedTags.count,
        },
        message: `Purged ${deletedVenues.count} seed venues (no Google/2GIS source).`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("purge-seed: failed", {
      endpoint: "/api/cron/purge-seed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: {
          code: "PURGE_ERROR",
          message: "Failed to purge seed data",
        },
      },
      { status: 500 },
    );
  }
}

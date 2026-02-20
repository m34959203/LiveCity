import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TwoGisService } from "@/services/twogis.service";
import { SocialSignalService } from "@/services/social-signal.service";
import { getClosestCity } from "@/lib/cities";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/venues/:id/sync
 *
 * Manually trigger 2GIS sync for a single venue.
 * Searches 2GIS, fetches reviews, enriches venue data.
 *
 * Use cases:
 *   - Test the parser on a specific venue
 *   - Force-refresh a venue's data
 *   - Admin tool for manual sync
 *
 * Rate limit: 5 req/min per IP (heavy operation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 5);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests. Max 5/min." } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { id } = await params;

    const venue = await prisma.venue.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        twoGisId: true,
        twoGisUrl: true,
        address: true,
        phone: true,
      },
    });

    if (!venue) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Venue not found" } },
        { status: 404 },
      );
    }

    const city = getClosestCity(venue.latitude, venue.longitude);
    const startTime = Date.now();

    // 1. Search on 2GIS (or use existing twoGisId)
    let twoGisData: Awaited<ReturnType<typeof TwoGisService.getVenueWithReviews>> = null;

    if (venue.twoGisId) {
      const reviews = await TwoGisService.fetchReviews(venue.twoGisId, 20);
      const venueInfo = await TwoGisService.searchVenue(
        venue.name,
        venue.latitude,
        venue.longitude,
        city.name,
      );
      if (venueInfo) {
        twoGisData = { venue: venueInfo, reviews };
      }
    } else {
      twoGisData = await TwoGisService.getVenueWithReviews(
        venue.name,
        venue.latitude,
        venue.longitude,
        city.name,
        20,
      );
    }

    if (!twoGisData) {
      return NextResponse.json({
        data: {
          venueId: venue.id,
          name: venue.name,
          status: "not_found_on_2gis",
          message: `"${venue.name}" not found on 2GIS in ${city.name}`,
          elapsedMs: Date.now() - startTime,
        },
      });
    }

    // 2. Enrich venue with full 2GIS data
    const v = twoGisData.venue;
    const updates: Record<string, unknown> = {};
    if (v.twoGisId) updates.twoGisId = v.twoGisId;
    if (v.twoGisUrl) updates.twoGisUrl = v.twoGisUrl;
    if (v.address) updates.address = v.address;
    if (v.phone) updates.phone = v.phone;
    if (v.email) updates.email = v.email;
    if (v.website) updates.website = v.website;
    if (v.whatsapp) updates.whatsapp = v.whatsapp;
    if (v.instagram) updates.instagramHandle = v.instagram;
    if (v.workingHours) updates.workingHours = v.workingHours;
    if (v.photoUrl) updates.photoUrls = [v.photoUrl];
    if (v.features.length > 0) updates.features = v.features;

    if (Object.keys(updates).length > 0) {
      await prisma.venue.update({ where: { id: venue.id }, data: updates });
    }

    // 3. Deduplicate reviews
    const existingReviews = await prisma.review.findMany({
      where: { venueId: venue.id, source: "2gis" },
      select: { authorName: true, text: true },
    });

    const existingKeys = new Set(
      existingReviews.map((r) => `${r.authorName}::${r.text?.slice(0, 50)}`),
    );

    const newReviews = twoGisData.reviews.filter(
      (r) =>
        r.text &&
        r.text.length > 5 &&
        !existingKeys.has(`${r.author}::${r.text.slice(0, 50)}`),
    );

    // 4. Store new reviews (with simple rating-based sentiment for speed)
    for (const review of newReviews) {
      const sentiment = Math.round(((review.rating - 3) / 2) * 100) / 100;
      await prisma.review.create({
        data: {
          venueId: venue.id,
          text: review.text,
          sentiment,
          source: "2gis",
          rating: review.rating,
          authorName: review.author,
        },
      });
    }

    // 5. Create social signal if new reviews
    if (newReviews.length > 0) {
      const avgRating =
        newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length;
      const avgSentiment = Math.round(((avgRating - 3) / 2) * 100) / 100;

      await prisma.socialSignal.create({
        data: {
          venueId: venue.id,
          source: "2gis",
          mentionCount: newReviews.length,
          sentimentAvg: avgSentiment,
        },
      });
    }

    // 6. Recalculate Live Score
    const newScore = await SocialSignalService.calculateLiveScore(venue.id);
    await prisma.venue.update({
      where: { id: venue.id },
      data: { liveScore: newScore },
    });

    const elapsed = Date.now() - startTime;

    logger.info(
      `Manual sync: "${venue.name}" — ${newReviews.length} new reviews, score → ${newScore}`,
      { endpoint: "/api/venues/:id/sync" },
    );

    return NextResponse.json({
      data: {
        venueId: venue.id,
        name: venue.name,
        status: "synced",
        twoGis: {
          id: v.twoGisId,
          url: v.twoGisUrl,
          rating: v.rating,
          reviewCount: v.reviewCount,
          address: v.address,
          phone: v.phone,
          email: v.email,
          website: v.website,
          whatsapp: v.whatsapp,
          instagram: v.instagram,
          workingHours: v.workingHours,
          photoUrl: v.photoUrl,
          rubrics: v.rubrics,
          features: v.features.slice(0, 20), // first 20 for readability
        },
        reviews: {
          fetched: twoGisData.reviews.length,
          new: newReviews.length,
          alreadyStored: existingReviews.length,
        },
        liveScore: newScore,
        elapsedMs: elapsed,
      },
    });
  } catch (error) {
    logger.error("POST /api/venues/:id/sync failed", {
      endpoint: "/api/venues/:id/sync",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "SYNC_ERROR", message: "Venue sync failed" } },
      { status: 500 },
    );
  }
}

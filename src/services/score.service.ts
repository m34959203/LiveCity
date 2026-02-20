import { prisma } from "@/lib/prisma";
import { SocialSignalService } from "./social-signal.service";
import { logger } from "@/lib/logger";

export class ScoreService {
  /**
   * Calculate Live Score using REAL social signals.
   * The "Truth Filter" — score that can't be faked.
   */
  static async calculateLiveScore(venueId: string): Promise<number> {
    return SocialSignalService.calculateLiveScore(venueId);
  }

  /**
   * Refresh live scores for all active venues.
   * 1. Try collecting fresh social signals (skipped if Apify not configured)
   * 2. Recalculate scores (always runs — uses category baseline when no signals)
   * 3. Save to history
   */
  static async refreshAllScores(): Promise<number> {
    // Only collect signals if Apify is configured; otherwise just recalculate
    if (process.env.APIFY_TOKEN) {
      await SocialSignalService.collectAllSignals();
    }

    const venues = await prisma.venue.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const v of venues) {
      const newScore = await this.calculateLiveScore(v.id);

      await prisma.venue.update({
        where: { id: v.id },
        data: { liveScore: newScore },
      });

      await prisma.scoreHistory.create({
        data: { venueId: v.id, score: newScore },
      });
    }

    logger.info(`Scores refreshed for ${venues.length} venues`, {
      endpoint: "ScoreService.refreshAllScores",
    });

    return venues.length;
  }

  /**
   * Get score history for dashboard chart.
   */
  static async getHistory(venueId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await prisma.scoreHistory.findMany({
      where: {
        venueId,
        calculatedAt: { gte: since },
      },
      orderBy: { calculatedAt: "asc" },
    });

    return records.map((r) => ({
      date: r.calculatedAt.toISOString().split("T")[0],
      score: r.score,
    }));
  }

  /**
   * Get district average score for comparison.
   */
  static async getDistrictAvg(
    latitude: number,
    longitude: number,
    radiusKm = 2,
  ) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

    const result = await prisma.venue.aggregate({
      where: {
        isActive: true,
        latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
        longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
      },
      _avg: { liveScore: true },
      _count: true,
    });

    return {
      avg: Math.round((result._avg.liveScore ?? 0) * 10) / 10,
      count: result._count,
    };
  }

  /**
   * City-wide average.
   */
  static async getCityAvg() {
    const result = await prisma.venue.aggregate({
      where: { isActive: true },
      _avg: { liveScore: true },
    });
    return Math.round((result._avg.liveScore ?? 0) * 10) / 10;
  }
}

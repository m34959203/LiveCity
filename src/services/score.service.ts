import { prisma } from "@/lib/prisma";

export class ScoreService {
  /**
   * Calculate Live Score for a venue.
   * Demo: base score from DB + time-of-day modifier + slight randomization.
   * Production: would pull real social signals, sentiment, check-ins.
   */
  static calculateDemoScore(baseScore: number): number {
    const hour = new Date().getHours();

    // Time-of-day modifier: busier in evenings, quieter at night
    let timeMod = 0;
    if (hour >= 11 && hour < 14) timeMod = 0.3; // lunch
    else if (hour >= 18 && hour < 22) timeMod = 0.5; // dinner peak
    else if (hour >= 22 || hour < 6) timeMod = -0.4; // late night
    else timeMod = 0;

    // Day-of-week: weekends busier
    const day = new Date().getDay();
    const weekendMod = day === 0 || day === 6 ? 0.3 : 0;

    // Small random jitter
    const jitter = (Math.random() - 0.5) * 0.6;

    const score = baseScore + timeMod + weekendMod + jitter;
    return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
  }

  /**
   * Refresh live scores for all active venues (batch).
   */
  static async refreshAllScores() {
    const venues = await prisma.venue.findMany({
      where: { isActive: true },
      select: { id: true, liveScore: true },
    });

    const updates = venues.map((v) =>
      prisma.venue.update({
        where: { id: v.id },
        data: { liveScore: this.calculateDemoScore(v.liveScore) },
      }),
    );

    await prisma.$transaction(updates);
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
    // Approximate: 1 degree lat ≈ 111km
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

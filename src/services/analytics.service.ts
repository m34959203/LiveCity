import { prisma } from "@/lib/prisma";
import { ScoreService } from "./score.service";
import { AIService } from "./ai.service";
import type { DashboardData } from "@/types/dashboard";

export class AnalyticsService {
  static async getDashboardData(venueId: string): Promise<DashboardData | null> {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        category: { select: { name: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!venue) return null;

    // Score history
    const scoreHistory = await ScoreService.getHistory(venueId, 30);

    // District comparison
    const district = await ScoreService.getDistrictAvg(venue.latitude, venue.longitude);
    const cityAvg = await ScoreService.getCityAvg();

    // Rank in district
    const venuesInDistrict = await prisma.venue.count({
      where: {
        isActive: true,
        liveScore: { gte: venue.liveScore },
        latitude: { gte: venue.latitude - 0.018, lte: venue.latitude + 0.018 },
        longitude: { gte: venue.longitude - 0.025, lte: venue.longitude + 0.025 },
      },
    });

    // AI: group complaints
    const reviewsForAI = venue.reviews.map((r) => ({
      text: r.text,
      sentiment: r.sentiment,
    }));
    const topComplaints = await AIService.groupComplaints(reviewsForAI);

    // AI: action plan
    const complaintTopics = topComplaints.map((c) => c.topic);
    const actionPlan = await AIService.generateActionPlan(
      venue.name,
      complaintTopics.length > 0 ? complaintTopics : ["Нет явных жалоб"],
      venue.liveScore,
    );

    return {
      venue: {
        id: venue.id,
        name: venue.name,
        liveScore: venue.liveScore,
        category: venue.category.name,
        address: venue.address,
        reviewCount: venue._count.reviews,
      },
      scoreHistory,
      topComplaints,
      actionPlan,
      generatedAt: new Date().toISOString(),
      districtComparison: {
        venueScore: venue.liveScore,
        districtAvg: district.avg,
        cityAvg,
        rank: venuesInDistrict,
        totalInDistrict: district.count,
      },
    };
  }
}

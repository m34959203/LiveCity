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

    // Rank in district (2 km radius, same formula as ScoreService.getDistrictAvg)
    const districtRadiusKm = 2;
    const latDelta = districtRadiusKm / 111;
    const lngDelta = districtRadiusKm / (111 * Math.cos((venue.latitude * Math.PI) / 180));

    const venuesInDistrict = await prisma.venue.count({
      where: {
        isActive: true,
        liveScore: { gte: venue.liveScore },
        latitude: { gte: venue.latitude - latDelta, lte: venue.latitude + latDelta },
        longitude: { gte: venue.longitude - lngDelta, lte: venue.longitude + lngDelta },
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

    // Parse AI analysis from aiDescription (set by sync-pulse pipeline)
    let aiAnalysis: DashboardData["aiAnalysis"] = null;
    if (venue.aiDescription) {
      const parts = venue.aiDescription.split(". ");
      const summary = parts[0] || "";
      const strongLine = parts.find((p) => p.startsWith("Сильные стороны:"));
      const weakLine = parts.find((p) => p.startsWith("Зоны роста:"));
      const trendLine = parts.find((p) => p.startsWith("Тренд:"));

      const strongPoints = strongLine
        ? strongLine.replace("Сильные стороны: ", "").split(", ")
        : [];
      const weakPoints = weakLine
        ? weakLine.replace("Зоны роста: ", "").split(", ")
        : [];
      const sentimentTrend = trendLine?.includes("улучшается")
        ? ("improving" as const)
        : trendLine?.includes("ухудшается")
          ? ("declining" as const)
          : ("stable" as const);

      aiAnalysis = { summary, weakPoints, strongPoints, sentimentTrend };
    }

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
      aiAnalysis,
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

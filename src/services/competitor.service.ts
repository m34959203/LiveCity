import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { geminiModel } from "@/lib/gemini";
import { logger } from "@/lib/logger";

const competitorInsightSchema = z.object({
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  summary: z.string().default(""),
});

interface CompetitorVenue {
  id: string;
  name: string;
  liveScore: number;
  address: string;
  distance: number;
}

export interface CompetitorInsight {
  competitors: CompetitorVenue[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  summary: string;
}

export class CompetitorService {
  /**
   * Find competitors: same category, within radius.
   */
  static async findCompetitors(
    venueId: string,
    radiusKm = 2,
  ): Promise<CompetitorVenue[]> {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { latitude: true, longitude: true, categoryId: true },
    });
    if (!venue) return [];

    const latDelta = radiusKm / 111;
    const lngDelta =
      radiusKm / (111 * Math.cos((venue.latitude * Math.PI) / 180));

    const competitors = await prisma.venue.findMany({
      where: {
        id: { not: venueId },
        categoryId: venue.categoryId,
        isActive: true,
        latitude: {
          gte: venue.latitude - latDelta,
          lte: venue.latitude + latDelta,
        },
        longitude: {
          gte: venue.longitude - lngDelta,
          lte: venue.longitude + lngDelta,
        },
      },
      select: {
        id: true,
        name: true,
        liveScore: true,
        address: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { liveScore: "desc" },
      take: 10,
    });

    return competitors.map((c) => ({
      id: c.id,
      name: c.name,
      liveScore: c.liveScore,
      address: c.address,
      distance: this.haversineKm(
        venue.latitude,
        venue.longitude,
        c.latitude,
        c.longitude,
      ),
    }));
  }

  /**
   * Generate competitive intelligence using AI.
   * "У конкурентов хвалят террасу, а у вас жалуются на духоту."
   */
  static async getCompetitorInsights(
    venueId: string,
  ): Promise<CompetitorInsight | null> {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { text: true, sentiment: true },
        },
        category: { select: { name: true } },
      },
    });
    if (!venue) return null;

    const competitors = await this.findCompetitors(venueId);
    if (competitors.length === 0) {
      return {
        competitors: [],
        strengths: ["Нет прямых конкурентов в радиусе 2 км"],
        weaknesses: [],
        opportunities: [
          "Монопольная позиция — можно привлечь всю аудиторию района",
        ],
        summary: "У вас нет прямых конкурентов рядом. Это преимущество.",
      };
    }

    // Fetch competitor reviews
    const competitorReviews = await prisma.review.findMany({
      where: {
        venueId: { in: competitors.map((c) => c.id) },
        sentiment: { gt: 0.2 },
      },
      select: { text: true, venue: { select: { name: true } } },
      orderBy: { sentiment: "desc" },
      take: 30,
    });

    const prompt = `Ты — бизнес-аналитик платформы LiveCity. Проведи конкурентный анализ.

Заведение: "${venue.name}" (${venue.category.name}, score: ${venue.liveScore}/10)
Отзывы клиентов:
${venue.reviews.map((r) => `- [${r.sentiment > 0 ? "+" : "-"}] "${r.text}"`).join("\n")}

Конкуренты (${venue.category.name} в радиусе 2 км):
${competitors.map((c) => `- "${c.name}" (score: ${c.liveScore}, ${c.distance.toFixed(1)} км)`).join("\n")}

Положительные отзывы конкурентов:
${competitorReviews.map((r) => `- [${r.venue.name}] "${r.text}"`).join("\n")}

Ответь СТРОГО в JSON:
{
  "strengths": ["в чём вы лучше конкурентов (2-3 пункта)"],
  "weaknesses": ["в чём проигрываете (2-3 пункта)"],
  "opportunities": ["конкретные действия для обгона конкурентов (2-3 пункта)"],
  "summary": "1-2 предложения — главный вывод для владельца"
}

Только JSON, без markdown.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text
        .replace(/```json?\s*/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = competitorInsightSchema.parse(JSON.parse(cleaned));

      return {
        competitors,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        opportunities: parsed.opportunities,
        summary: parsed.summary,
      };
    } catch (error) {
      logger.error("CompetitorService AI failed", {
        endpoint: "CompetitorService.getCompetitorInsights",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        competitors,
        strengths: ["Данные анализируются..."],
        weaknesses: ["Данные анализируются..."],
        opportunities: ["Данные анализируются..."],
        summary: "AI-анализ временно недоступен. Попробуйте позже.",
      };
    }
  }

  /**
   * Haversine distance in km.
   */
  private static haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

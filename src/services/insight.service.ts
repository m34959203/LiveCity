import { prisma } from "@/lib/prisma";
import { geminiModel } from "@/lib/gemini";
import { SocialSignalService } from "./social-signal.service";
import { logger } from "@/lib/logger";

export interface VenueInsight {
  venue: { id: string; name: string; liveScore: number; category: string };
  pulse: {
    totalMentions: number;
    trend: "rising" | "stable" | "declining";
    avgSentiment: number;
  };
  hook: string;
  problems: string[];
  quickWins: string[];
  estimatedRevenueLoss: string;
}

export class InsightService {
  /**
   * "Trojan Horse" — generate a FREE insight for any venue.
   * This is the hook that gets businesses into the platform.
   *
   * Strategy: come to the business with a pain point they didn't know about.
   * "You're losing guests. Here's why. Try fixing it free (7 days)."
   */
  static async generateFreeInsight(
    venueId: string,
  ): Promise<VenueInsight | null> {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        category: { select: { name: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { text: true, sentiment: true, source: true },
        },
      },
    });
    if (!venue) return null;

    const pulse = await SocialSignalService.getSocialPulse(venueId);

    const negativeReviews = venue.reviews.filter((r) => r.sentiment < -0.1);
    const positiveReviews = venue.reviews.filter((r) => r.sentiment > 0.2);

    const prompt = `Ты — бизнес-консультант LiveCity. Сгенерируй БЕСПЛАТНЫЙ инсайт для заведения, чтобы привлечь его как клиента.

Заведение: "${venue.name}" (${venue.category.name})
Live Score: ${venue.liveScore}/10
Социальный пульс: ${pulse.totalMentions} упоминаний за неделю, тренд: ${pulse.trend}, настроение: ${pulse.avgSentiment}

Негативные отзывы (${negativeReviews.length}):
${negativeReviews.slice(0, 10).map((r) => `- "${r.text}" (${r.source})`).join("\n") || "Нет"}

Позитивные отзывы (${positiveReviews.length}):
${positiveReviews.slice(0, 5).map((r) => `- "${r.text}"`).join("\n") || "Нет"}

Сгенерируй инсайт. Ответь СТРОГО в JSON:
{
  "hook": "1 предложение-крючок, показывающее проблему владельцу (пример: 'Вы теряете до 30% гостей из-за долгого ожидания')",
  "problems": ["проблема 1", "проблема 2", "проблема 3"],
  "quickWins": ["быстрое решение 1 (бесплатно или дёшево)", "быстрое решение 2"],
  "estimatedRevenueLoss": "примерная оценка потерь в месяц (пример: '200 000 - 400 000 тг')"
}

Будь конкретен, используй данные из отзывов. Только JSON, без markdown.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text
        .replace(/```json?\s*/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      return {
        venue: {
          id: venue.id,
          name: venue.name,
          liveScore: venue.liveScore,
          category: venue.category.name,
        },
        pulse: {
          totalMentions: pulse.totalMentions,
          trend: pulse.trend,
          avgSentiment: pulse.avgSentiment,
        },
        hook: parsed.hook || "",
        problems: parsed.problems || [],
        quickWins: parsed.quickWins || [],
        estimatedRevenueLoss: parsed.estimatedRevenueLoss || "",
      };
    } catch (error) {
      logger.error("InsightService AI failed", {
        endpoint: "InsightService.generateFreeInsight",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        venue: {
          id: venue.id,
          name: venue.name,
          liveScore: venue.liveScore,
          category: venue.category.name,
        },
        pulse: {
          totalMentions: pulse.totalMentions,
          trend: pulse.trend,
          avgSentiment: pulse.avgSentiment,
        },
        hook: `${venue.name} имеет потенциал роста — сейчас ${venue.liveScore}/10`,
        problems: negativeReviews.length > 0
          ? ["Есть негативные отзывы, которые снижают рейтинг"]
          : ["Мало упоминаний в соцсетях"],
        quickWins: [
          "Отвечайте на отзывы — это повышает лояльность",
          "Публикуйте stories — это поднимает Live Score",
        ],
        estimatedRevenueLoss: "Требует анализа",
      };
    }
  }
}

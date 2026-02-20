import { z } from "zod";
import { geminiModel } from "@/lib/gemini";
import { logger } from "@/lib/logger";

const venueAnalysisSchema = z.object({
  vibeScore: z.number(),
  weakPoints: z.array(z.string()).default([]),
  strongPoints: z.array(z.string()).default([]),
  sentimentTrend: z.enum(["improving", "stable", "declining"]).default("stable"),
  summary: z.string().default(""),
});

// ============================================
// AI Analyzer Service — The Brain
// ============================================
// Deep analysis of review batches via Gemini 2.0 Flash.
// Returns structured insights for B2B dashboard.
//
// Used by sync-pulse cron job to enrich venue data
// after fresh Google reviews are collected.
// ============================================

export interface VenueAnalysis {
  vibeScore: number; // 0-10: overall "vibe" from reviews
  weakPoints: string[]; // problems mentioned by customers
  strongPoints: string[]; // strengths mentioned by customers
  sentimentTrend: "improving" | "stable" | "declining";
  summary: string; // 1-2 sentence summary for dashboard
}

export interface ReviewForAnalysis {
  text: string;
  rating: number;
  source: string;
}

export class AIAnalyzerService {
  /**
   * Analyze a batch of reviews for a venue using Gemini.
   * Single API call per venue — cost-efficient.
   *
   * Input: array of recent review texts with ratings
   * Output: structured analysis for B2B dashboard
   */
  static async analyzeReviewsBatch(
    venueName: string,
    category: string,
    reviews: ReviewForAnalysis[],
  ): Promise<VenueAnalysis> {
    if (reviews.length === 0) {
      return this.emptyAnalysis();
    }

    const reviewTexts = reviews
      .map(
        (r, i) =>
          `[${i + 1}] ${r.text} (${r.rating}/5, ${r.source})`,
      )
      .join("\n");

    const prompt = `Ты — AI-аналитик платформы LiveCity. Проанализируй отзывы клиентов о заведении.

Заведение: "${venueName}" (${category})
Отзывы (${reviews.length} шт.):
${reviewTexts}

Проанализируй и ответь СТРОГО в JSON:
{
  "vibeScore": <число 0-10, общая оценка "вайба" заведения по отзывам>,
  "weakPoints": ["слабая сторона 1", "слабая сторона 2", ...],
  "strongPoints": ["сильная сторона 1", "сильная сторона 2", ...],
  "sentimentTrend": "improving|stable|declining",
  "summary": "1-2 предложения: ключевой инсайт для владельца"
}

Правила:
- weakPoints и strongPoints — max 5 каждый, на русском, конкретно (не абстрактно)
- summary — полезный инсайт, а не пересказ
- vibeScore — основан на общем настрое отзывов, а не на средней оценке
- sentimentTrend — "improving" если свежие отзывы лучше старых, "declining" если хуже

Только JSON, без markdown, без пояснений.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text
        .replace(/```json?\s*/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = venueAnalysisSchema.parse(JSON.parse(cleaned));

      return {
        vibeScore: Math.max(0, Math.min(10, parsed.vibeScore)),
        weakPoints: parsed.weakPoints.slice(0, 5),
        strongPoints: parsed.strongPoints.slice(0, 5),
        sentimentTrend: parsed.sentimentTrend,
        summary: parsed.summary,
      };
    } catch (error) {
      logger.error("AIAnalyzerService.analyzeReviewsBatch failed", {
        endpoint: "AIAnalyzerService.analyzeReviewsBatch",
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackAnalysis(reviews);
    }
  }

  /**
   * Batch sentiment scoring for individual reviews.
   * Returns array of sentiment values [-1, 1].
   */
  static async batchSentiment(texts: string[]): Promise<number[]> {
    if (texts.length === 0) return [];

    const numbered = texts
      .map((t, i) => `[${i + 1}] ${t}`)
      .join("\n");

    try {
      const result = await geminiModel.generateContent(
        `Оцени настрой каждого отзыва по шкале от -1.0 (очень негативный) до 1.0 (очень позитивный). ` +
          `Верни ТОЛЬКО JSON-массив чисел, по одному на отзыв. ` +
          `Пример: [-0.3, 0.8, 0.5]\n\n${numbered}`,
      );

      const text = result.response.text().trim();
      const match = text.match(/\[[\s\S]*?\]/);
      if (!match) {
        return texts.map(() => 0);
      }

      const scores: unknown[] = JSON.parse(match[0]);
      return scores.map((s) => {
        const num = Number(s);
        if (isNaN(num)) return 0;
        return Math.max(-1, Math.min(1, Math.round(num * 100) / 100));
      });
    } catch (error) {
      logger.warn("AIAnalyzerService.batchSentiment failed", {
        endpoint: "AIAnalyzerService.batchSentiment",
        error: error instanceof Error ? error.message : String(error),
      });
      return texts.map(() => 0);
    }
  }

  private static emptyAnalysis(): VenueAnalysis {
    return {
      vibeScore: 5,
      weakPoints: [],
      strongPoints: [],
      sentimentTrend: "stable",
      summary: "Недостаточно отзывов для анализа",
    };
  }

  private static fallbackAnalysis(reviews: ReviewForAnalysis[]): VenueAnalysis {
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    return {
      vibeScore: Math.round(avgRating * 2 * 10) / 10,
      weakPoints: avgRating < 3.5 ? ["Есть негативные отзывы"] : [],
      strongPoints: avgRating >= 4 ? ["Высокие оценки клиентов"] : [],
      sentimentTrend: "stable",
      summary: `Средняя оценка: ${avgRating.toFixed(1)}/5. Требуется ручной анализ.`,
    };
  }
}

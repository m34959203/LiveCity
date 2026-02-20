import { z } from "zod";
import { geminiModel } from "@/lib/gemini";
import { SocialSignalService } from "./social-signal.service";
import type { VenueListItem } from "@/types/venue";

interface AISearchResult {
  venueId: string;
  relevance: number;
  reason: string;
}

interface AIActionPlan {
  priority: number;
  action: string;
  expectedImpact: string;
  difficulty: "low" | "medium" | "high";
}

// Zod schemas for AI response validation
const searchResponseSchema = z.object({
  interpretation: z.string().default(""),
  results: z.array(z.object({
    venueId: z.string(),
    relevance: z.number(),
    reason: z.string().default(""),
  })).default([]),
});

const actionPlanSchema = z.array(z.object({
  priority: z.number(),
  action: z.string(),
  expectedImpact: z.string(),
  difficulty: z.enum(["low", "medium", "high"]),
}));

const complaintSchema = z.array(z.object({
  topic: z.string(),
  percentage: z.number(),
  reviewCount: z.number(),
  trend: z.enum(["rising", "stable", "declining"]),
}));

export class AIService {
  /**
   * Semantic search: rank venues by natural language query.
   * Now includes social pulse data so AI knows which venues are ALIVE right now.
   */
  static async semanticSearch(
    query: string,
    venues: VenueListItem[],
    location?: { latitude: number; longitude: number },
    cityName: string = "Алматы",
  ): Promise<{
    results: AISearchResult[];
    interpretation: string;
  }> {
    // Enrich venue context with social pulse
    const top50 = venues.slice(0, 50);
    const pulsePromises = top50.map((v) =>
      SocialSignalService.getSocialPulse(v.id).catch(() => null),
    );
    const pulses = await Promise.all(pulsePromises);

    const venueContext = top50.map((v, i) => {
      const p = pulses[i];
      return {
        id: v.id,
        name: v.name,
        category: v.category.name,
        address: v.address,
        score: v.liveScore,
        tags: v.tags.join(", "),
        lat: v.latitude,
        lng: v.longitude,
        ...(p && {
          socialMentions: p.totalMentions,
          socialSentiment: p.avgSentiment,
          socialTrend: p.trend,
        }),
      };
    });

    const locationHint = location
      ? `Пользователь находится: lat=${location.latitude}, lng=${location.longitude}. Учитывай расстояние.`
      : "";

    const prompt = `Ты — AI-ассистент платформы LiveCity (${cityName}). Пользователь ищет заведение.

Запрос: "${query}"
${locationHint}

Вот список заведений (JSON). Поля socialMentions/socialSentiment/socialTrend показывают РЕАЛЬНУЮ активность в соцсетях за последнюю неделю.
${JSON.stringify(venueContext)}

ВАЖНО:
1. ВСЕГДА выбери хотя бы 2-3 заведения подходящей категории. Никогда не возвращай пустой results.
   "живая музыка" → бары, рестораны, клубы. "где поесть" → рестораны, кафе. "с детьми" → парки, кафе, ТРЦ.
2. В reason пиши ТОЛЬКО факты: категорию и рейтинг. НЕ придумывай чего нет в данных (меню, интерьер, атмосфера).
   Плохо: "может предложить шашлык в своём меню"
   Хорошо: "Ресторан с рейтингом 6.3 — подходит по категории"

Ответь СТРОГО в JSON формате:
{
  "interpretation": "краткое описание что ищет пользователь (1 предложение на русском)",
  "results": [
    {"venueId": "id", "relevance": 0.95, "reason": "краткое и честное объяснение (на русском, без выдумок)"}
  ]
}

Только JSON, без markdown, без пояснений.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip markdown code blocks if present
      const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      const parsed = searchResponseSchema.parse(JSON.parse(cleaned));

      return {
        interpretation: parsed.interpretation,
        results: parsed.results.map((r) => ({
          venueId: r.venueId,
          relevance: Math.min(1, Math.max(0, r.relevance || 0)),
          reason: r.reason,
        })),
      };
    } catch (error) {
      console.error("AIService.semanticSearch error:", error);
      // Fallback: simple text matching
      return this.fallbackSearch(query, venues);
    }
  }

  /**
   * Generate AI action plan for business dashboard.
   */
  static async generateActionPlan(
    venueName: string,
    complaints: string[],
    score: number,
  ): Promise<AIActionPlan[]> {
    const prompt = `Ты — бизнес-консультант платформы LiveCity. Заведение "${venueName}" (текущий рейтинг: ${score}/10).

Основные жалобы клиентов:
${complaints.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Предложи 3 конкретных действия для улучшения рейтинга. Ответь СТРОГО в JSON:
[
  {"priority": 1, "action": "что сделать", "expectedImpact": "ожидаемый эффект", "difficulty": "low|medium|high"}
]

Только JSON, без markdown.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      return actionPlanSchema.parse(JSON.parse(cleaned));
    } catch (error) {
      console.error("AIService.generateActionPlan error:", error);
      return [
        {
          priority: 1,
          action: "Провести опрос клиентов для выявления проблем",
          expectedImpact: "Понимание реальных болей клиентов",
          difficulty: "low",
        },
        {
          priority: 2,
          action: "Улучшить скорость обслуживания",
          expectedImpact: "Повышение удовлетворённости на 20%",
          difficulty: "medium",
        },
        {
          priority: 3,
          action: "Обновить интерьер и меню",
          expectedImpact: "Привлечение новой аудитории",
          difficulty: "high",
        },
      ];
    }
  }

  /**
   * Group reviews into complaint topics using AI.
   */
  static async groupComplaints(
    reviews: { text: string; sentiment: number }[],
  ): Promise<{ topic: string; percentage: number; reviewCount: number; trend: "rising" | "stable" | "declining" }[]> {
    const negativeReviews = reviews
      .filter((r) => r.sentiment < 0)
      .map((r) => r.text);

    if (negativeReviews.length === 0) {
      return [];
    }

    const prompt = `Сгруппируй эти жалобы клиентов по темам (макс 5 тем). Жалобы:
${negativeReviews.map((r, i) => `${i + 1}. "${r}"`).join("\n")}

Ответь СТРОГО в JSON:
[{"topic": "тема жалобы", "percentage": 35, "reviewCount": 5, "trend": "rising|stable|declining"}]

Только JSON, без markdown.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      return complaintSchema.parse(JSON.parse(cleaned));
    } catch {
      return [
        { topic: "Долгое ожидание", percentage: 40, reviewCount: negativeReviews.length, trend: "stable" as const },
      ];
    }
  }

  /**
   * Keyword → relevant category slugs for fuzzy matching.
   */
  private static readonly KEYWORD_CATEGORIES: [RegExp, string[]][] = [
    [/музык|танц|вечер|клуб|диджей|dj|караоке/i, ["bar", "entertainment"]],
    [/ресторан|ужин|романтик|обед|банкет/i, ["restaurant"]],
    [/кафе|кофе|завтрак|десерт|выпечк/i, ["cafe"]],
    [/бар|пиво|коктейл|виски|напит/i, ["bar"]],
    [/парк|прогул|природ|озер|сквер|детск|ребенк|ребёнк/i, ["park"]],
    [/кино|фильм|боулинг|развлеч|игр/i, ["entertainment"]],
    [/шоппинг|магазин|торгов|молл|трц/i, ["mall"]],
    [/поесть|голод|еда|кухн|вкусн|шашлык|мясо/i, ["restaurant", "cafe"]],
  ];

  /**
   * Fallback search when Gemini is unavailable.
   * Uses keyword-to-category mapping for fuzzy matching.
   */
  private static fallbackSearch(
    query: string,
    venues: VenueListItem[],
  ): { results: AISearchResult[]; interpretation: string } {
    const q = query.toLowerCase();

    // Find relevant categories from keywords
    const relevantCategories = new Set<string>();
    for (const [regex, cats] of this.KEYWORD_CATEGORIES) {
      if (regex.test(q)) cats.forEach((c) => relevantCategories.add(c));
    }

    const scored = venues.map((v) => {
      let relevance = 0;
      const text = `${v.name} ${v.category.name} ${v.address} ${v.tags.join(" ")}`.toLowerCase();

      // Direct text match
      for (const word of q.split(/\s+/)) {
        if (word.length >= 3 && text.includes(word)) relevance += 0.3;
      }

      // Category match from keywords
      if (relevantCategories.has(v.category.slug)) {
        relevance += 0.5;
      }

      // Score bonus (higher score = better recommendation)
      relevance += v.liveScore / 30;

      return {
        venueId: v.id,
        relevance: Math.min(1, relevance),
        reason: relevantCategories.has(v.category.slug)
          ? `${v.category.name} — может подойти по вашему запросу`
          : v.category.name,
      };
    });

    const results = scored
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .filter((r) => r.relevance > 0.1);

    return {
      interpretation: `Поиск по запросу: "${query}"`,
      results,
    };
  }
}

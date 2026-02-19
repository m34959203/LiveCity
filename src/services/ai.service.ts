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

Вот список заведений (JSON). Поля socialMentions/socialSentiment/socialTrend показывают РЕАЛЬНУЮ активность в соцсетях за последнюю неделю. Чем больше упоминаний и чем выше настроение — тем «живее» место прямо сейчас. Предпочитай места с высокой активностью и позитивным настроением.
${JSON.stringify(venueContext)}

Выбери до 5 наиболее подходящих заведений. Ответь СТРОГО в JSON формате:
{
  "interpretation": "краткое описание что ищет пользователь (1 предложение на русском)",
  "results": [
    {"venueId": "id", "relevance": 0.95, "reason": "почему подходит (1-2 предложения на русском, упомяни социальную активность если она высокая)"}
  ]
}

Только JSON, без markdown, без пояснений.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip markdown code blocks if present
      const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        interpretation: parsed.interpretation || "",
        results: (parsed.results || []).map((r: AISearchResult) => ({
          venueId: r.venueId,
          relevance: Math.min(1, Math.max(0, r.relevance || 0)),
          reason: r.reason || "",
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
      return JSON.parse(cleaned);
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
      return JSON.parse(cleaned);
    } catch {
      return [
        { topic: "Долгое ожидание", percentage: 40, reviewCount: negativeReviews.length, trend: "stable" as const },
      ];
    }
  }

  /**
   * Fallback search when Gemini is unavailable.
   */
  private static fallbackSearch(
    query: string,
    venues: VenueListItem[],
  ): { results: AISearchResult[]; interpretation: string } {
    const q = query.toLowerCase();
    const scored = venues.map((v) => {
      let relevance = 0;
      const text = `${v.name} ${v.category.name} ${v.address} ${v.tags.join(" ")}`.toLowerCase();
      for (const word of q.split(/\s+/)) {
        if (text.includes(word)) relevance += 0.3;
      }
      relevance += v.liveScore / 30;
      return { venueId: v.id, relevance: Math.min(1, relevance), reason: v.category.name };
    });

    return {
      interpretation: `Поиск по запросу: "${query}"`,
      results: scored
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5)
        .filter((r) => r.relevance > 0.1),
    };
  }
}

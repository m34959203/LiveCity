import { geminiModel } from "@/lib/gemini";
import { VenueService } from "./venue.service";
import { logger } from "@/lib/logger";

export interface PlannerRequest {
  query: string;
  preferences?: {
    groupType?: string; // "семья с детьми", "пара", "друзья", "один"
    budget?: string; // "эконом", "средний", "премиум"
    startTime?: string; // "10:00"
    endTime?: string; // "22:00"
  };
  location?: { latitude: number; longitude: number };
}

export interface PlanStep {
  time: string;
  venue: {
    id: string;
    name: string;
    category: string;
    liveScore: number;
    address: string;
  };
  duration: string;
  reason: string;
  tips: string;
}

export interface DayPlan {
  title: string;
  description: string;
  steps: PlanStep[];
  totalDuration: string;
  estimatedBudget: string;
}

export class PlannerService {
  /**
   * AI Day Planner — build an optimized day plan.
   * Takes a natural language request + preferences,
   * returns a timeline of venues with logistics.
   */
  static async planDay(request: PlannerRequest): Promise<DayPlan> {
    const { data: venues } = await VenueService.getAll({ limit: 100 });

    const venueContext = venues.slice(0, 60).map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category.name,
      address: v.address,
      score: v.liveScore,
      tags: v.tags.join(", "),
      lat: v.latitude,
      lng: v.longitude,
    }));

    const prefText = request.preferences
      ? `
Предпочтения:
- Группа: ${request.preferences.groupType || "не указано"}
- Бюджет: ${request.preferences.budget || "не указано"}
- Время: ${request.preferences.startTime || "10:00"} — ${request.preferences.endTime || "22:00"}`
      : "";

    const locationText = request.location
      ? `Текущее местоположение: lat=${request.location.latitude}, lng=${request.location.longitude}`
      : "";

    const prompt = `Ты — AI-планировщик дня в Алматы (платформа LiveCity). Составь оптимальный маршрут.

Запрос: "${request.query}"
${prefText}
${locationText}

Доступные заведения (JSON):
${JSON.stringify(venueContext)}

Составь план дня из 3-6 точек. Учитывай:
1. Логистику — выбирай места рядом друг с другом
2. Логику дня (завтрак → активность → обед → отдых → ужин)
3. Live Score — предлагай места с высоким рейтингом
4. Группу и бюджет, если указаны
5. Время работы — не предлагай бары утром

Ответь СТРОГО в JSON:
{
  "title": "короткое название плана (3-5 слов)",
  "description": "описание плана (1-2 предложения)",
  "steps": [
    {
      "time": "10:00",
      "venueId": "id заведения из списка",
      "duration": "1.5 часа",
      "reason": "почему именно это место (1 предложение)",
      "tips": "совет (что заказать, что посмотреть, где припарковаться)"
    }
  ],
  "totalDuration": "примерная длительность (например: 8 часов)",
  "estimatedBudget": "примерный бюджет на человека (например: 15 000 — 25 000 тг)"
}

Только JSON, без markdown.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text
        .replace(/```json?\s*/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      // Enrich steps with full venue data
      const venueMap = new Map(venues.map((v) => [v.id, v]));
      const steps: PlanStep[] = (parsed.steps || [])
        .map(
          (s: {
            venueId: string;
            time: string;
            duration: string;
            reason: string;
            tips: string;
          }) => {
            const venue = venueMap.get(s.venueId);
            if (!venue) return null;
            return {
              time: s.time,
              venue: {
                id: venue.id,
                name: venue.name,
                category: venue.category.name,
                liveScore: venue.liveScore,
                address: venue.address,
              },
              duration: s.duration,
              reason: s.reason,
              tips: s.tips || "",
            };
          },
        )
        .filter(Boolean) as PlanStep[];

      return {
        title: parsed.title || "Ваш план на день",
        description: parsed.description || "",
        steps,
        totalDuration: parsed.totalDuration || "",
        estimatedBudget: parsed.estimatedBudget || "",
      };
    } catch (error) {
      logger.error("PlannerService AI failed", {
        endpoint: "PlannerService.planDay",
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback: top 4 venues by score
      const topVenues = venues.slice(0, 4);
      return {
        title: "Лучшие места Алматы",
        description: "AI-планировщик временно недоступен. Вот топ заведения.",
        steps: topVenues.map((v, i) => ({
          time: `${10 + i * 3}:00`,
          venue: {
            id: v.id,
            name: v.name,
            category: v.category.name,
            liveScore: v.liveScore,
            address: v.address,
          },
          duration: "2 часа",
          reason: `Live Score ${v.liveScore}/10`,
          tips: "",
        })),
        totalDuration: "12 часов",
        estimatedBudget: "10 000 — 30 000 тг",
      };
    }
  }
}

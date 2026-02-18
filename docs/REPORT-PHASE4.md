# Отчёт: Фаза 4 — AI-интеграция

**Дата:** 2026-02-18
**Статус:** Завершена

---

## Что сделано

### Epic 4.1: Gemini AI Service

| Файл | Назначение |
|---|---|
| `src/lib/gemini.ts` | Gemini AI client (gemini-2.0-flash) |
| `src/services/ai.service.ts` | AIService: semanticSearch, generateActionPlan, groupComplaints + fallback |
| `src/app/api/search/route.ts` | POST /api/search — AI-поиск с валидацией и обогащением |

**AIService реализует:**
- `semanticSearch(query, venues, location)` — промпт → Gemini → JSON → ranked results
- `generateActionPlan(name, complaints, score)` — 3 AI-рекомендации для бизнеса
- `groupComplaints(reviews)` — группировка негативных отзывов по темам
- `fallbackSearch()` — текстовый поиск если Gemini недоступен

### Epic 4.2: Dashboard

| Файл | Назначение |
|---|---|
| `src/services/analytics.service.ts` | AnalyticsService: score history, complaints, action plan, district comparison |
| `src/app/api/dashboard/[venueId]/route.ts` | GET /api/dashboard/:venueId |
| `src/app/dashboard/page.tsx` | Страница дашборда |
| `src/components/dashboard/ScoreChart.tsx` | График Live Score за 30 дней (recharts) |
| `src/components/dashboard/ComplaintsList.tsx` | Топ-жалобы с трендами |
| `src/components/dashboard/ActionPlan.tsx` | AI-рекомендации (3 шага) |
| `src/components/dashboard/DistrictComparison.tsx` | Сравнение с районом и городом |

---

## API Endpoints (итого)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/venues` | Список заведений |
| GET | `/api/venues/:id` | Детали заведения |
| GET | `/api/categories` | Категории |
| GET | `/api/heatmap` | Тепловая карта |
| POST | `/api/search` | AI-поиск (Gemini) |
| GET | `/api/dashboard/:venueId` | Бизнес-аналитика |

## Проверки

| Проверка | Результат |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass — 6 API routes + /dashboard видны |

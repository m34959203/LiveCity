# Отчёт: Фаза 2 — Backend Core

**Дата:** 2026-02-18
**Статус:** Завершена

---

## Что сделано

### Epic 2.1: API — Заведения

| Задача | Статус | Файл |
|---|---|---|
| VenueService | Done | `src/services/venue.service.ts` |
| GET /api/venues | Done | `src/app/api/venues/route.ts` |
| GET /api/venues/:id | Done | `src/app/api/venues/[id]/route.ts` |
| GET /api/categories | Done | `src/app/api/categories/route.ts` |

**VenueService** реализует:
- `getAll(filters)` — пагинация, фильтры по bounds/category/tag/minScore
- `getById(id)` — полная информация + теги + последние 10 отзывов
- `getByBounds(sw, ne)` — геопространственный запрос

### Epic 2.2: Live Score Engine

| Задача | Статус | Файл |
|---|---|---|
| ScoreService | Done | `src/services/score.service.ts` |

**ScoreService** реализует:
- `calculateDemoScore(base)` — модификаторы: время суток, день недели, jitter
- `refreshAllScores()` — batch-обновление всех заведений
- `getHistory(venueId, days)` — история score для дашборда
- `getDistrictAvg(lat, lng, radius)` — среднее по району
- `getCityAvg()` — среднее по городу

### Epic 2.3: Heatmap API

| Задача | Статус | Файл |
|---|---|---|
| GET /api/heatmap | Done | `src/app/api/heatmap/route.ts` |

Агрегация score по гео-кластерам с настраиваемым resolution (low/medium/high).

---

## API Endpoints

| Метод | Путь | Параметры |
|---|---|---|
| GET | `/api/venues` | bounds, category, tag, minScore, limit, offset |
| GET | `/api/venues/:id` | — |
| GET | `/api/categories` | — |
| GET | `/api/heatmap` | bounds, resolution |

## Проверки

| Проверка | Результат |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass — все 4 API routes видны |

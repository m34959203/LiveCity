# LiveCity — Дорожная карта разработки (Demo v1.0)

**Статус:** Все 5 фаз завершены
**Обновлено:** 2026-02-18

---

## Обзор фаз

```
ФАЗА 1           ФАЗА 2           ФАЗА 3           ФАЗА 4           ФАЗА 5
ФУНДАМЕНТ        BACKEND CORE     FRONTEND CORE     ИНТЕГРАЦИЯ AI     POLISH
──────────────────────────────────────────────────────────────────────────
[x] Scaffolding   [x] API          [x] Карта + UI    [x] Gemini        [x] Тесты
[x] Database      [x] Seed data    [x] Компоненты    [x] Dashboard AI  [x] UX Polish
[x] CI/CD         [x] Score logic  [x] Search UI     [x] Heatmap       [x] CI Tests
──────────────────────────────────────────────────────────────────────────
```

---

## ФАЗА 1: ФУНДАМЕНТ — Done

### Epic 1.1: Инициализация проекта

| Задача | Статус |
|---|---|
| Next.js 16 + TypeScript (strict) + App Router | [x] |
| Tailwind CSS 4 (без shadcn/ui) | [x] |
| ESLint (Next.js preset) + Prettier | [x] |
| .env.example + Zod validation (env.ts) | [x] |

### Epic 1.2: База данных

| Задача | Статус |
|---|---|
| Prisma 6 + PostgreSQL schema (7 моделей) | [x] |
| Seed: 70 заведений, 6 категорий, 12 тегов | [x] |
| Seed: reviews, score history, social signals | [x] |
| Prisma client singleton (prisma.ts) | [x] |

### Epic 1.3: CI/CD

| Задача | Статус |
|---|---|
| GitHub Actions: lint + typecheck | [x] |
| GitHub Actions: build | [x] |

---

## ФАЗА 2: BACKEND CORE — Done

### Epic 2.1: API — Заведения

| Задача | Статус |
|---|---|
| VenueService: getAll, getById, getByBounds | [x] |
| GET /api/venues (bounds, category, tag, minScore, pagination) | [x] |
| GET /api/venues/:id (tags, reviews) | [x] |
| GET /api/categories (с count) | [x] |
| TypeScript типы: venue.ts, search.ts, dashboard.ts | [x] |

### Epic 2.2: Live Score Engine

| Задача | Статус |
|---|---|
| ScoreService: calculateDemoScore (time + weekend + jitter) | [x] |
| ScoreService: refreshAllScores (batch) | [x] |
| ScoreService: getHistory, getDistrictAvg, getCityAvg | [x] |

### Epic 2.3: Heatmap API

| Задача | Статус |
|---|---|
| GET /api/heatmap (grid bucket aggregation) | [x] |

---

## ФАЗА 3: FRONTEND CORE — Done

### Epic 3.1: Layout

| Задача | Статус |
|---|---|
| Root layout (lang=ru, OG-теги, без внешних шрифтов) | [x] |
| Header (floating LiveCity logo) | [x] |

### Epic 3.2: Карта

| Задача | Статус |
|---|---|
| MapView: Mapbox dark-v11, react-map-gl, dynamic import | [x] |
| VenueMarker: цвет-код (green/amber/gray) | [x] |
| HeatmapLayer: GeoJSON Source + heatmap layer | [x] |
| MapControls: heatmap toggle, geolocation, zoom ± | [x] |

### Epic 3.3: Карточка заведения

| Задача | Статус |
|---|---|
| VenueDetails: desktop side panel + mobile bottom sheet | [x] |
| VenueCard: compact card for search results | [x] |
| LiveScoreBadge: 3 размера, 3 цвета | [x] |

### Epic 3.4: Строка поиска

| Задача | Статус |
|---|---|
| SearchBar: floating input + 4 example chips | [x] |
| SearchResults: AI results panel, mobile full-width | [x] |

---

## ФАЗА 4: AI-ИНТЕГРАЦИЯ — Done

### Epic 4.1: Gemini AI Service

| Задача | Статус |
|---|---|
| gemini.ts: GoogleGenerativeAI client (gemini-2.0-flash) | [x] |
| AIService.semanticSearch: prompt + parse JSON + fallback | [x] |
| AIService.generateActionPlan: 3 рекомендации | [x] |
| AIService.groupComplaints: группировка негативных отзывов | [x] |
| POST /api/search: validate + AI + enrichment | [x] |

### Epic 4.2: Dashboard

| Задача | Статус |
|---|---|
| AnalyticsService.getDashboardData | [x] |
| GET /api/dashboard/:venueId | [x] |
| ScoreChart (Recharts LineChart, 30 дней) | [x] |
| ComplaintsList (темы + тренды) | [x] |
| ActionPlan (3 рекомендации + difficulty) | [x] |
| DistrictComparison (venue vs район vs город) | [x] |
| /dashboard page | [x] |

---

## ФАЗА 5: POLISH & DEPLOY — Done

### Epic 5.1: Тестирование

| Задача | Статус |
|---|---|
| Vitest + React Testing Library setup | [x] |
| ScoreService тесты (5) | [x] |
| AIService тесты (7, с mock Gemini) | [x] |
| LiveScoreBadge тесты (6) | [x] |
| ComplaintsList тесты (5) | [x] |
| ActionPlan тесты (5) | [x] |
| DistrictComparison тесты (4) | [x] |
| Type contracts тесты (5) | [x] |

### Epic 5.2: UX Polish

| Задача | Статус |
|---|---|
| Mobile VenueDetails: bottom sheet | [x] |
| Mobile SearchBar/SearchResults: responsive | [x] |
| Dashboard: skeleton loader | [x] |
| Dashboard: error state с иконкой | [x] |
| Error toast для venues loading | [x] |
| Escape key для закрытия панелей | [x] |
| ESLint fix: VenueDetails → useReducer | [x] |

### Epic 5.3: CI/CD

| Задача | Статус |
|---|---|
| GitHub Actions: Tests job (Vitest) | [x] |
| npm scripts: test, test:watch | [x] |

---

## Итоговая статистика

| Метрика | Значение |
|---|---|
| Фазы | 5 / 5 завершено |
| API endpoints | 6 |
| Сервисы | 4 (Venue, Score, AI, Analytics) |
| Компоненты | 12 |
| Страницы | 2 (/, /dashboard) |
| Тесты | 37 |
| CI jobs | 3 (Lint, Tests, Build) |
| Seed-данные | 70 заведений, 6 категорий, 12 тегов |
| Модели БД | 7 |

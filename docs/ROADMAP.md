# LiveCity — Дорожная карта разработки

**Статус:** 7 фаз завершено (5 базовых + 2 расширения)
**Обновлено:** 2026-02-20

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

ФАЗА 6                          ФАЗА 7
DATA PIPELINE                   BEYOND MVP
──────────────────────────────────────────────────────────────────────────
[x] 2GIS парсер                 [x] AI Planner
[x] OSM Overpass                [x] Конкурентная разведка (SWOT)
[x] sync-pulse (3 modes)        [x] "The Hook" (инсайты)
[x] City Radar                  [x] Social Pulse
[x] Lazy Discovery              [x] AI Analyzer (deep reviews)
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
| Prisma 6 + PostgreSQL schema (7 моделей, 21 поле Venue) | [x] |
| Seed: заведения, 6 категорий, 12 тегов | [x] |
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
| CategoryFilter: фильтрация по категориям | [x] |
| CitySelector: 5 городов КЗ | [x] |

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
| ErrorBoundary компонент | [x] |

### Epic 5.3: CI/CD

| Задача | Статус |
|---|---|
| GitHub Actions: Tests job (Vitest) | [x] |
| npm scripts: test, test:watch | [x] |
| Production startup script (scripts/start.mjs) | [x] |

---

## ФАЗА 6: DATA PIPELINE — Done

### Epic 6.1: Собственный 2GIS парсер

| Задача | Статус |
|---|---|
| TwoGisService: searchVenue (каталог 2GIS) | [x] |
| TwoGisService: fetchReviews (20 отзывов) | [x] |
| Извлечение контактов: phone, email, website, WhatsApp, Instagram | [x] |
| Извлечение: часы работы, фото, рубрики, features | [x] |
| Rate limiting (rate-limit.ts) | [x] |

### Epic 6.2: OpenStreetMap Overpass

| Задача | Статус |
|---|---|
| overpass-osm.ts: клиент Overpass API | [x] |
| Маппинг русских ключевых слов → OSM тегов | [x] |
| Fallback на community mirror | [x] |
| cities.ts: конфигурация 5 городов КЗ | [x] |

### Epic 6.3: Sync Pipeline (sync-pulse)

| Задача | Статус |
|---|---|
| 3-Mode pipeline (Apify / 2GIS parser / OSM-only) | [x] |
| Автовыбор режима по env-переменным | [x] |
| AI-анализ отзывов (AIAnalyzerService) | [x] |
| Stale detection + batch processing | [x] |
| POST /api/cron/sync-pulse | [x] |

### Epic 6.4: Score & Signals

| Задача | Статус |
|---|---|
| SocialSignalService: calculateLiveScore (формула Truth Filter) | [x] |
| SocialSignalService: collectSignals (2GIS + Instagram) | [x] |
| SocialSignalService: getSocialPulse (7-day aggregation) | [x] |
| POST /api/cron/refresh-scores | [x] |
| GET /api/venues/:id/pulse | [x] |
| POST /api/venues/:id/sync | [x] |

### Epic 6.5: City Radar

| Задача | Статус |
|---|---|
| POST /api/cron/venue-scout (OSM discovery) | [x] |
| 5 городов КЗ: Алматы, Астана, Шымкент, Караганда, Жезказган | [x] |
| Дедупликация с БД | [x] |
| Deterministic initial scores | [x] |

### Epic 6.6: Lazy Discovery

| Задача | Статус |
|---|---|
| 3-ступенчатый поиск: AI → keyword → OSM | [x] |
| Автосоздание venues из OpenStreetMap | [x] |
| Интеграция в POST /api/search | [x] |

---

## ФАЗА 7: BEYOND MVP — Done

### Epic 7.1: AI Day Planner

| Задача | Статус |
|---|---|
| PlannerService.planDay() | [x] |
| POST /api/planner | [x] |
| /planner page (textarea + preferences + timeline) | [x] |

### Epic 7.2: Конкурентная разведка

| Задача | Статус |
|---|---|
| CompetitorService: findCompetitors (2km, same category) | [x] |
| CompetitorService: getCompetitorInsights (Gemini SWOT) | [x] |
| GET /api/dashboard/:venueId/competitors | [x] |
| CompetitorInsights component (dashboard) | [x] |

### Epic 7.3: "The Hook" (бесплатные инсайты)

| Задача | Статус |
|---|---|
| InsightService.generateFreeInsight() | [x] |
| GET /api/insights/:venueId (публичный, без auth) | [x] |
| /insights page (каталог заведений) | [x] |
| /insights/[venueId] page (hook + problems + CTA) | [x] |

### Epic 7.4: Dashboard v2

| Задача | Статус |
|---|---|
| SocialPulse component (breakdown по источникам) | [x] |
| AI Analysis (strong/weak points, sentiment trend) | [x] |
| Venue selector (dropdown) | [x] |
| Quick stats (mentions/week, sentiment, city avg) | [x] |

---

## Итоговая статистика

| Метрика | Значение |
|---|---|
| Фазы | 7 / 7 завершено |
| Реализованные фичи | 13 (7 MVP + 6 расширенных) |
| API endpoints | 15 (11 public + 4 cron) |
| Сервисы | 10 |
| Компоненты | 19 |
| Страницы | 5 (/, /dashboard, /insights, /insights/[id], /planner) |
| Тесты | 53 (8 файлов) |
| CI jobs | 3 (Lint, Tests, Build) |
| Модели БД | 7 (21 поле Venue) |
| Внешние интеграции | 6 (Gemini, 2GIS, OSM, Mapbox, Apify, Google Places) |
| Утилиты (lib) | 10 |
| Города КЗ | 5 |

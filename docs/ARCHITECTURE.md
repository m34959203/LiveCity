# LiveCity — Архитектура системы

**Версия:** 2.0
**Обновлено:** 2026-02-20

---

## 1. Обзор архитектуры

**Модульный монолит** на базе Next.js 16 (App Router). Frontend и backend в одном проекте. После демо — возможна миграция backend в отдельный сервис.

```
┌──────────────────────────────────────────────────────────────────┐
│                      КЛИЕНТ (Браузер)                            │
│  ┌────────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │
│  │ Map View   │ │ Search │ │Dashboard │ │ Planner │ │Insights│  │
│  │ (Mapbox)   │ │ (AI)   │ │(Recharts)│ │ (AI)    │ │(Hook)  │  │
│  └─────┬──────┘ └───┬────┘ └────┬─────┘ └────┬────┘ └───┬────┘  │
│        └─────────────┼──────────┼─────────────┼──────────┘       │
│                      │ HTTP/REST                                 │
└──────────────────────┼───────────────────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────────────────┐
│                NEXT.JS SERVER (App Router)                        │
│                      │                                           │
│  ┌───────────────────▼──────────────────────────────────┐        │
│  │              API ROUTES (/api/*)  — 15 endpoints     │        │
│  │                                                      │        │
│  │  PUBLIC (11):                                        │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │        │
│  │  │ /venues  │ │ /search  │ │ /dashboard/:venueId  │  │        │
│  │  │ /venues/ │ │          │ │ /dashboard/:id/      │  │        │
│  │  │   :id    │ │          │ │   competitors        │  │        │
│  │  │ /venues/ │ │          │ │ /insights/:venueId   │  │        │
│  │  │  :id/sync│ │          │ │ /planner             │  │        │
│  │  │ /venues/ │ │          │ │                      │  │        │
│  │  │  :id/    │ │          │ │                      │  │        │
│  │  │  pulse   │ │          │ │                      │  │        │
│  │  │ /categ.  │ │          │ │                      │  │        │
│  │  │ /heatmap │ │          │ │                      │  │        │
│  │  └────┬─────┘ └────┬─────┘ └──────┬───────────────┘  │        │
│  │       │            │              │                   │        │
│  │  CRON (4, protected by CRON_SECRET):                  │        │
│  │  ┌────────────────────────────────────────────────┐   │        │
│  │  │ sync-pulse │ refresh-scores │ venue-scout │ *  │   │        │
│  │  └────────────┴────────────────┴─────────────┴────┘   │        │
│  └───────┼────────────┼──────────────┼───────────────────┘        │
│          │            │              │                            │
│  ┌───────▼────────────▼──────────────▼───────────────────┐        │
│  │               SERVICE LAYER (10 сервисов)             │        │
│  │                                                       │        │
│  │  ┌──────────────┐  ┌──────────────────────┐           │        │
│  │  │ VenueService │  │ AIService            │           │        │
│  │  │  getAll()    │  │  semanticSearch()    │           │        │
│  │  │  getById()   │  │  keywordSearch()     │           │        │
│  │  └──────┬───────┘  │  generateActionPlan()│           │        │
│  │         │          │  groupComplaints()   │           │        │
│  │  ┌──────▼───────┐  └──────────┬───────────┘           │        │
│  │  │ ScoreService │             │                       │        │
│  │  │  calculate() │  ┌──────────▼──────────────────┐    │        │
│  │  │  getHistory()│  │ AIAnalyzerService           │    │        │
│  │  │  refresh()   │  │  analyzeReviewsBatch()      │    │        │
│  │  └──────┬───────┘  │  batchSentiment()           │    │        │
│  │         │          └─────────────────────────────┘    │        │
│  │  ┌──────▼──────────────┐  ┌──────────────────────┐    │        │
│  │  │SocialSignalService  │  │ AnalyticsService     │    │        │
│  │  │  collectSignals()   │  │  getDashboardData()  │    │        │
│  │  │  calculateLiveScore │  └──────────────────────┘    │        │
│  │  │  getSocialPulse()   │                              │        │
│  │  └──────┬──────────────┘  ┌──────────────────────┐    │        │
│  │         │                 │ CompetitorService     │    │        │
│  │  ┌──────▼───────┐        │  findCompetitors()    │    │        │
│  │  │ TwoGisService│        │  getInsights()        │    │        │
│  │  │  search()    │        └──────────────────────┘    │        │
│  │  │  reviews()   │                                    │        │
│  │  └──────────────┘        ┌──────────────────────┐    │        │
│  │                          │ InsightService        │    │        │
│  │  ┌──────────────┐        │  generateFreeInsight()│    │        │
│  │  │PlannerService│        └──────────────────────┘    │        │
│  │  │  planDay()   │                                    │        │
│  │  └──────────────┘                                    │        │
│  └───────────────────────────────────────────────────────┘        │
│                          │                                       │
│  ┌───────────────────────▼───────────────────────────────┐        │
│  │              DATA LAYER (Prisma 6 ORM)                │        │
│  └───────────────────────┬───────────────────────────────┘        │
└──────────────────────────┼───────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │      PostgreSQL         │
              │  7 моделей (Prisma)     │
              └─────────────────────────┘
```

### Внешние сервисы

```
┌─────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                       │
│                                                         │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ Gemini 2.0   │  │ 2GIS (public) │  │ OpenStreetMap│  │
│  │ Flash        │  │ Собственный   │  │ Overpass API │  │
│  │              │  │ парсер        │  │              │  │
│  │ - Semantic   │  │               │  │ - Lazy       │  │
│  │   search     │  │ - Venue info  │  │   Discovery  │  │
│  │ - Sentiment  │  │ - Reviews     │  │ - City Radar │  │
│  │ - Action plan│  │ - Contacts    │  │ - Auto-create│  │
│  │ - Complaints │  │ - Hours       │  │   venues     │  │
│  │ - SWOT       │  │ - Photos      │  │              │  │
│  │ - Planner    │  │               │  │ FREE, no key │  │
│  │ - Insights   │  │ FREE, no key  │  │              │  │
│  └──────────────┘  └───────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ Mapbox GL    │  │ Apify         │  │ Google Places│  │
│  │              │  │ (опционально) │  │ (опционально)│  │
│  │ - Map render │  │               │  │              │  │
│  │ - Heatmap    │  │ - Instagram   │  │ - Place ID   │  │
│  │ - Markers    │  │   scraper     │  │   matching   │  │
│  │              │  │ - 2GIS legacy │  │              │  │
│  └──────────────┘  └───────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Структура проекта (актуальная)

```
livecity/
├── .github/workflows/ci.yml      # 3 jobs: lint+typecheck, tests, build
├── prisma/
│   ├── schema.prisma              # 7 моделей (21 поле в Venue)
│   └── seed.ts                    # Seed-данные: 6 категорий, 12 тегов
├── scripts/
│   └── start.mjs                  # Production startup (auto-seed)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (lang=ru, OG-теги)
│   │   ├── page.tsx               # Главная: карта + поиск + venue panel
│   │   ├── dashboard/page.tsx     # Бизнес-дашборд (AI аналитика + конкуренты)
│   │   ├── insights/page.tsx      # Каталог заведений для инсайтов
│   │   ├── insights/[venueId]/page.tsx  # "The Hook" — бесплатный инсайт
│   │   ├── planner/page.tsx       # AI Day Planner
│   │   └── api/                   # 15 REST endpoints (11 public + 4 cron)
│   │       ├── venues/route.ts              # GET /api/venues
│   │       ├── venues/[id]/route.ts         # GET /api/venues/:id
│   │       ├── venues/[id]/sync/route.ts    # POST /api/venues/:id/sync
│   │       ├── venues/[id]/pulse/route.ts   # GET /api/venues/:id/pulse
│   │       ├── categories/route.ts          # GET /api/categories
│   │       ├── heatmap/route.ts             # GET /api/heatmap
│   │       ├── search/route.ts              # POST /api/search (AI + Lazy Discovery)
│   │       ├── dashboard/[venueId]/route.ts # GET /api/dashboard/:venueId
│   │       ├── dashboard/[venueId]/competitors/route.ts  # GET competitors
│   │       ├── insights/[venueId]/route.ts  # GET /api/insights/:venueId
│   │       ├── planner/route.ts             # POST /api/planner
│   │       └── cron/                        # Protected by CRON_SECRET
│   │           ├── sync-pulse/route.ts      # Main pipeline (3 modes)
│   │           ├── refresh-scores/route.ts  # Score recalculation
│   │           ├── venue-scout/route.ts     # City Radar (OSM discovery)
│   │           └── purge-seed/route.ts      # Seed cleanup (disabled)
│   ├── components/                # 19 компонентов
│   │   ├── city/CitySelector.tsx
│   │   ├── map/                   # MapView, VenueMarker, HeatmapLayer, MapControls, CategoryFilter
│   │   ├── search/                # SearchBar, SearchResults
│   │   ├── venue/                 # VenueCard, VenueDetails
│   │   ├── dashboard/             # ScoreChart, ComplaintsList, ActionPlan,
│   │   │                          # DistrictComparison, SocialPulse, CompetitorInsights
│   │   ├── layout/Header.tsx
│   │   └── ui/                    # LiveScoreBadge, ErrorBoundary
│   ├── services/                  # 10 сервисов
│   │   ├── venue.service.ts
│   │   ├── score.service.ts
│   │   ├── social-signal.service.ts
│   │   ├── ai.service.ts
│   │   ├── ai-analyzer.service.ts
│   │   ├── analytics.service.ts
│   │   ├── competitor.service.ts
│   │   ├── insight.service.ts
│   │   ├── planner.service.ts
│   │   └── twogis.service.ts
│   ├── lib/                       # 10 утилит
│   │   ├── prisma.ts, gemini.ts, env.ts
│   │   ├── overpass-osm.ts, apify-2gis.ts, google-places.ts
│   │   ├── cities.ts, rate-limit.ts, logger.ts, format.ts
│   ├── types/                     # venue.ts, search.ts, dashboard.ts
│   └── __tests__/                 # 53 Vitest теста (8 файлов)
├── vitest.config.ts
├── tsconfig.json
├── .prettierrc
└── package.json
```

---

## 3. Ключевые модули

### 3.1. Map Module

**Компоненты:** `MapView`, `VenueMarker`, `HeatmapLayer`, `MapControls`, `CategoryFilter`, `CitySelector`

- MapView: `react-map-gl/mapbox`, стиль `dark-v11`, dynamic import (SSR disabled)
- VenueMarker: цвет-код — green (≥8), amber (≥5), gray (<5)
- HeatmapLayer: GeoJSON Source + нативный heatmap layer Mapbox
- MapControls: кнопки heatmap toggle, geolocation, zoom ±
- CategoryFilter: фильтрация по категориям заведений
- CitySelector: переключение между 5 городами КЗ
- Auto-refresh: venues обновляются каждые 2 минуты

### 3.2. Search Module (3-ступенчатый)

**Компоненты:** `SearchBar`, `SearchResults`

```
User input → POST /api/search { query, limit }
  → Stage 1: AIService.semanticSearch(query, venues)
    → Gemini 2.0 Flash (prompt + venues JSON + social pulse)
    → JSON: { interpretation, results: [{ venueId, relevance, reason }] }
  → Stage 2 (if AI fails): AIService.keywordSearch(query, venues)
    → текстовый поиск по названию/категории/тегам
  → Stage 3 (if 0 results): Lazy Discovery
    → OpenStreetMap Overpass query
    → Auto-create venues in DB
    → Return discovered venues
  → Response: { results: [{ venue, relevance, reason }], interpretation }
```

### 3.3. Score Module (Truth Filter)

**Сервисы:** `ScoreService`, `SocialSignalService`

```
SocialSignalService.calculateLiveScore(venue):
  base       = средний рейтинг из отзывов (0-10)
  activity   = нормализованное кол-во упоминаний за 7 дней
  sentiment  = средний сентимент (-1..+1 → 0..10)
  timeMod    = модификатор времени суток (lunch/dinner/night)

  score = base*0.4 + activity*0.3 + sentiment*0.2 + timeMod*0.1
  return clamp(score, 0, 10)

  Fallback (нет сигналов): baseline по категории + hash venue
```

Data pipeline (`sync-pulse`):
```
For each stale venue:
  1. TwoGisService.searchVenue(name, city) → venue info
  2. TwoGisService.fetchReviews(twoGisId) → reviews
  3. AIAnalyzerService.analyzeReviewsBatch(reviews) → sentiment + insights
  4. SocialSignalService.calculateLiveScore() → new score
  5. Update venue: aiDescription, contacts, working hours, score
```

### 3.4. Dashboard Module

**Компоненты:** `ScoreChart`, `ComplaintsList`, `ActionPlan`, `DistrictComparison`, `SocialPulse`, `CompetitorInsights`

```
AnalyticsService.getDashboardData(venueId):
  venue            = VenueService.getById()
  scoreHistory     = ScoreService.getHistory(30 дней)
  districtAvg      = ScoreService.getDistrictAvg(lat, lng, 2km)
  cityAvg          = ScoreService.getCityAvg()
  socialPulse      = SocialSignalService.getSocialPulse(venueId)
  topComplaints    = AIService.groupComplaints(reviews)        // Gemini
  actionPlan       = AIService.generateActionPlan(name, ...)   // Gemini
  aiAnalysis       = AIAnalyzerService output (strong/weak points)
  → DashboardData

CompetitorService.getCompetitorInsights(venueId):
  competitors      = findCompetitors(category, lat, lng, 2km)
  competitorReviews = fetch positive reviews of competitors
  insights         = Gemini: compare venue vs competitors
  → { competitors, strengths, weaknesses, opportunities, summary }
```

### 3.5. Planner Module

**Компоненты:** страница `/planner`

```
PlannerService.planDay(query, preferences):
  venues = VenueService.getAll() // with scores
  prompt = build prompt with group type, budget, venues data
  plan   = Gemini: optimize route (3-6 venues, timeline, budget)
  → { steps: [{ time, venue, duration, reason, tips }], totalDuration, budgetEstimate }
```

### 3.6. Insights Module ("The Hook")

**Страницы:** `/insights`, `/insights/[venueId]`

```
InsightService.generateFreeInsight(venueId):
  venue    = VenueService.getById()
  reviews  = last 50 reviews
  pulse    = SocialSignalService.getSocialPulse()
  insight  = Gemini: generate hook, problems, quickWins, revenueLoss
  → { hook, problems, quickWins, estimatedRevenueLoss, socialPulse }
```

---

## 4. Data Pipeline (Cron Jobs)

### 4.1. sync-pulse (главный pipeline)

**Частота:** каждые 6-12 часов
**Защита:** CRON_SECRET header

3 режима (автовыбор по env):
- **Mode A:** Apify 2GIS (legacy, batch: 10)
- **Mode B:** Собственный 2GIS парсер (default, batch: 30)
- **Mode C:** OSM-only fallback (batch: 100)

Pipeline:
1. Выбрать stale venues (не обновлялись > 24 часов)
2. Приоритет: unscored → oldest updated
3. Per venue: search → reviews → AI analyze → score → update
4. Лимит: batch size per run

### 4.2. refresh-scores

**Частота:** каждые 15 минут
- Пересчёт Live Score для всех активных venues
- Запись в score_history

### 4.3. venue-scout (City Radar)

**Частота:** еженедельно (воскресенье)
- Для каждого из 5 городов КЗ:
  - Запрос OpenStreetMap Overpass (все типы venues)
  - Дедупликация с БД
  - Создание новых venues с начальным score
  - Новые venues подхватываются sync-pulse

### 4.4. purge-seed (отключён)

Очистка seed-данных. Отключён для защиты OSM-discovered venues.

---

## 5. Интеграции

### 5.1. Google Gemini AI (gemini-2.0-flash)

| Метод | Сервис | Назначение |
|---|---|---|
| `semanticSearch()` | AIService | Ранжирование заведений по NL-запросу |
| `keywordSearch()` | AIService | Fallback текстовый поиск |
| `generateActionPlan()` | AIService | 3 рекомендации для бизнеса |
| `groupComplaints()` | AIService | Группировка жалоб по темам |
| `analyzeReviewsBatch()` | AIAnalyzerService | Sentiment + strong/weak points |
| `batchSentiment()` | AIAnalyzerService | Сентимент отдельных отзывов |
| `getCompetitorInsights()` | CompetitorService | SWOT-анализ конкурентов |
| `generateFreeInsight()` | InsightService | "The Hook" инсайты |
| `planDay()` | PlannerService | AI Day Planner маршрут |

Каждый метод имеет catch-блок с fallback-данными.

### 5.2. 2GIS (собственный парсер)

- `TwoGisService.searchVenue()` — поиск в каталоге 2GIS
- `TwoGisService.fetchReviews()` — загрузка отзывов (20 шт)
- Извлекает: адрес, телефон, email, сайт, WhatsApp, Instagram, часы работы, фото, рубрики, features
- Бесплатный, без API-ключа

### 5.3. OpenStreetMap Overpass

- `overpass-osm.ts` — клиент Overpass API
- Используется в: Lazy Discovery (search), City Radar (venue-scout)
- Маппинг русских ключевых слов → OSM тегов
- Fallback на community mirror при ошибке основного endpoint
- Бесплатный, без API-ключа

### 5.4. Mapbox GL JS

- Стиль: `dark-v11`, обёртка: `react-map-gl/mapbox` v8
- Heatmap: нативный layer type + GeoJSON source
- Markers: цвет-код по Live Score

### 5.5. WhatsApp

- `wa.me/{phone}?text={encoded}` в VenueDetails

### 5.6. Apify (опционально)

- Instagram scraper: `apify/instagram-scraper`
- 2GIS Places (legacy): `m_mamaev/2gis-places-scraper`
- Pricing: $1.50 / 1,000 results

---

## 6. Переменные окружения

### Обязательные

```env
DATABASE_URL=postgresql://user:password@host:5432/livecity
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
CRON_SECRET=your_cron_secret
```

### Опциональные

```env
# Apify (для Instagram и legacy 2GIS)
APIFY_TOKEN=your_apify_token
APIFY_2GIS_ACTOR=actor_id
APIFY_2GIS_PLACES_ACTOR=actor_id
APIFY_INSTA_ACTOR=actor_id

# Город и карта
DEFAULT_CITY=Алматы
NEXT_PUBLIC_DEFAULT_LAT=43.2380
NEXT_PUBLIC_DEFAULT_LNG=76.9450
NEXT_PUBLIC_DEFAULT_ZOOM=12

# Cron настройки
CRON_BATCH_SIZE_APIFY=10
CRON_BATCH_SIZE_PARSER=30
CRON_BATCH_SIZE_OSM=100
CRON_STALE_HOURS=24
```

---

## 7. CI/CD и Production Startup

### GitHub Actions

```
.github/workflows/ci.yml
├── Lint & Typecheck (ESLint + tsc --noEmit)
├── Tests (Vitest — 53 теста)
└── Build (prisma generate + next build)

Triggers: push main/claude/**, PR to main
```

### Production Startup (`scripts/start.mjs`)

Скрипт `npm run start` выполняет:
1. `prisma db push --skip-generate` — синхронизация схемы БД
2. Проверка: если БД пустая → автоматический seed
3. `next start` — запуск production-сервера

---

## 8. UX-решения

| Элемент | Desktop | Mobile |
|---|---|---|
| VenueDetails | Side panel (right, max-w-sm) | Bottom sheet (max-h-70vh) |
| SearchResults | Fixed 320px | Full-width |
| Dashboard | 2-column grid | Single column |
| Planner | Centered layout, max-w-2xl | Full-width |
| Insights | Card grid | Single column |
| Keyboard | Escape закрывает все панели | — |
| Loading | Map spinner, search skeleton, dashboard skeleton | — |
| Errors | Toast для venues, message для dashboard | — |

---

## 9. Эволюция после демо

```
Текущее состояние           →  MVP v1.0              →  Scale
────────────────────────────────────────────────────────────────
Монолит Next.js             →  Отдельный API сервис  →  Микросервисы
2GIS парсер + OSM           →  + Google Places       →  ML pipeline
PostgreSQL                  →  Managed PostgreSQL    →  + Redis + Elastic
Vercel                      →  Docker + VPS          →  Kubernetes
Без авторизации             →  Auth (NextAuth)       →  + OAuth + roles
13 фич реализовано          →  + Payment, CRM        →  + Marketplace
Только web                  →  + PWA                 →  + React Native
5 городов КЗ                →  Вся Центральная Азия  →  Глобально
```

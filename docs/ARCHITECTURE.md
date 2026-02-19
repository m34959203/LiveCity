# LiveCity — Архитектура системы

**Версия:** 1.0 (Demo — все 5 фаз завершены)
**Обновлено:** 2026-02-18

---

## 1. Обзор архитектуры

**Модульный монолит** на базе Next.js 16 (App Router). Frontend и backend в одном проекте. После демо — возможна миграция backend в отдельный сервис.

```
┌──────────────────────────────────────────────────────────┐
│                      КЛИЕНТ (Браузер)                    │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Map View   │  │ Search   │  │ Business Dashboard   │  │
│  │ (Mapbox)   │  │ (AI)     │  │ (Recharts)           │  │
│  └─────┬──────┘  └────┬─────┘  └──────────┬───────────┘  │
│        │              │                    │              │
│        └──────────────┼────────────────────┘              │
│                       │ HTTP/REST                         │
└───────────────────────┼──────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────┐
│                 NEXT.JS SERVER (App Router)               │
│                       │                                  │
│  ┌────────────────────▼─────────────────────────┐        │
│  │              API ROUTES (/api/*)              │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │        │
│  │  │ /venues  │ │ /search  │ │ /dashboard   │  │        │
│  │  │ /categ.  │ │          │ │   /:venueId  │  │        │
│  │  │ /heatmap │ │          │ │              │  │        │
│  │  └────┬─────┘ └────┬─────┘ └──────┬───────┘  │        │
│  └───────┼────────────┼──────────────┼───────────┘        │
│          │            │              │                    │
│  ┌───────▼────────────▼──────────────▼───────────┐        │
│  │            SERVICE LAYER                       │        │
│  │  ┌──────────────┐  ┌──────────────────────┐   │        │
│  │  │ VenueService │  │ AIService            │   │        │
│  │  │  getAll()    │  │  semanticSearch()    │   │        │
│  │  │  getById()   │  │  generateActionPlan()│   │        │
│  │  │  getByBounds │  │  groupComplaints()   │   │        │
│  │  └──────┬───────┘  └──────────┬───────────┘   │        │
│  │         │                     │                │        │
│  │  ┌──────▼───────┐  ┌─────────▼────────────┐   │        │
│  │  │ ScoreService │  │ AnalyticsService     │   │        │
│  │  │  calculate() │  │  getDashboardData()  │   │        │
│  │  │  getHistory()│  │                      │   │        │
│  │  │  refresh()   │  │                      │   │        │
│  │  └──────┬───────┘  └──────────┬───────────┘   │        │
│  └─────────┼─────────────────────┼────────────────┘        │
│            │                     │                        │
│  ┌─────────▼─────────────────────▼────────────────┐        │
│  │              DATA LAYER (Prisma 6 ORM)         │        │
│  └─────────────────────┬──────────────────────────┘        │
└────────────────────────┼─────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │    PostgreSQL       │
              │  7 моделей (Prisma) │
              └─────────────────────┘
```

---

## 2. Структура проекта (актуальная)

```
livecity/
├── .github/workflows/ci.yml      # 3 jobs: lint+typecheck, tests, build
├── prisma/
│   ├── schema.prisma              # 7 моделей (без PostGIS extensions)
│   └── seed.ts                    # 70 заведений Алматы, 6 категорий, 12 тегов
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (lang=ru, OG-теги)
│   │   ├── page.tsx               # Главная: карта + поиск + venue panel
│   │   ├── dashboard/page.tsx     # Бизнес-дашборд (skeleton, error state)
│   │   └── api/                   # 6 REST endpoints
│   │       ├── venues/route.ts           # GET /api/venues
│   │       ├── venues/[id]/route.ts      # GET /api/venues/:id
│   │       ├── categories/route.ts       # GET /api/categories
│   │       ├── heatmap/route.ts          # GET /api/heatmap
│   │       ├── search/route.ts           # POST /api/search
│   │       └── dashboard/[venueId]/route.ts  # GET /api/dashboard/:venueId
│   ├── components/                # 12 компонентов
│   │   ├── map/                   # MapView, VenueMarker, HeatmapLayer, MapControls
│   │   ├── search/                # SearchBar, SearchResults
│   │   ├── venue/                 # VenueCard, VenueDetails
│   │   ├── dashboard/             # ScoreChart, ComplaintsList, ActionPlan, DistrictComparison
│   │   ├── layout/Header.tsx
│   │   └── ui/LiveScoreBadge.tsx
│   ├── services/                  # 4 сервиса
│   │   ├── venue.service.ts
│   │   ├── score.service.ts
│   │   ├── ai.service.ts
│   │   └── analytics.service.ts
│   ├── lib/                       # prisma.ts, gemini.ts, env.ts
│   ├── types/                     # venue.ts, search.ts, dashboard.ts
│   └── __tests__/                 # 37 Vitest тестов
├── vitest.config.ts
├── tsconfig.json
├── .prettierrc
└── package.json
```

---

## 3. Ключевые модули

### 3.1. Map Module

**Компоненты:** `MapView`, `VenueMarker`, `HeatmapLayer`, `MapControls`

- MapView: `react-map-gl/mapbox`, стиль `dark-v11`, dynamic import (SSR disabled)
- VenueMarker: цвет-код — green (≥8), amber (≥5), gray (<5)
- HeatmapLayer: GeoJSON Source + нативный heatmap layer Mapbox
- MapControls: кнопки heatmap toggle, geolocation, zoom ±

### 3.2. Search Module

**Компоненты:** `SearchBar`, `SearchResults`

```
User input → POST /api/search { query, limit }
  → VenueService.getAll() (загрузка контекста)
  → AIService.semanticSearch(query, venues)
    → Gemini 2.0 Flash (prompt + venues JSON)
    → JSON: { interpretation, results: [{ venueId, relevance, reason }] }
  → Enrichment: venue details из БД
  → Response: { results: [{ venue, relevance, reason }], interpretation }
```

**Fallback:** При ошибке Gemini — текстовый поиск по названию/категории/тегам.

### 3.3. Score Module

**Сервис:** `ScoreService`

```
calculateDemoScore(baseScore):
  timeMod    = lunch: +0.3, dinner: +0.5, night: -0.4
  weekendMod = weekend: +0.3
  jitter     = random(−0.3, +0.3)
  return clamp(round(baseScore + timeMod + weekendMod + jitter, 1), 0, 10)
```

Дополнительно: `refreshAllScores`, `getHistory`, `getDistrictAvg`, `getCityAvg`.

### 3.4. Dashboard Module

**Компоненты:** `ScoreChart`, `ComplaintsList`, `ActionPlan`, `DistrictComparison`

```
AnalyticsService.getDashboardData(venueId):
  scoreHistory     = ScoreService.getHistory(30 дней)
  districtAvg      = ScoreService.getDistrictAvg(lat, lng, 2km)
  cityAvg          = ScoreService.getCityAvg()
  topComplaints    = AIService.groupComplaints(reviews)        // Gemini
  actionPlan       = AIService.generateActionPlan(name, ...)   // Gemini
  → DashboardData
```

---

## 4. Интеграции

### 4.1. Google Gemini AI (gemini-2.0-flash)

| Метод | Назначение |
|---|---|
| `semanticSearch()` | Ранжирование заведений по NL-запросу |
| `generateActionPlan()` | 3 рекомендации для бизнеса |
| `groupComplaints()` | Группировка негативных отзывов по темам |

Каждый метод имеет catch-блок с fallback-данными.

### 4.2. Mapbox GL JS

- Стиль: `dark-v11`, обёртка: `react-map-gl/mapbox` v8
- Heatmap: нативный layer type + GeoJSON source

### 4.3. WhatsApp

- `wa.me/{phone}?text={encoded}` в VenueDetails

---

## 5. Переменные окружения

```env
DATABASE_URL=postgresql://user:password@host:5432/livecity
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_DEFAULT_LAT=43.2380    # опционально
NEXT_PUBLIC_DEFAULT_LNG=76.9450    # опционально
NEXT_PUBLIC_DEFAULT_ZOOM=12        # опционально
```

---

## 6. CI/CD

```
GitHub Actions: .github/workflows/ci.yml
├── Lint & Typecheck (ESLint + tsc --noEmit)
├── Tests (Vitest — 37 тестов)
└── Build (prisma generate + next build)

Triggers: push main/claude/**, PR to main
```

---

## 7. UX-решения

| Элемент | Desktop | Mobile |
|---|---|---|
| VenueDetails | Side panel (right, max-w-sm) | Bottom sheet (max-h-70vh) |
| SearchResults | Fixed 320px | Full-width |
| Dashboard | 2-column grid | Single column |
| Keyboard | Escape закрывает все панели | — |
| Loading | Map spinner, search skeleton, dashboard skeleton | — |
| Errors | Toast для venues, message для dashboard | — |

---

## 8. Эволюция после демо

```
Demo (сейчас)          →  MVP v1.0              →  Scale
─────────────────────────────────────────────────────────
Монолит Next.js        →  Отдельный API сервис  →  Микросервисы
Seed-данные            →  Реальные соцсети API  →  ML pipeline
PostgreSQL             →  Managed PostgreSQL    →  + Redis + Elastic
Vercel                 →  Docker + VPS          →  Kubernetes
Без авторизации        →  Auth (NextAuth)       →  + OAuth + roles
Только web             →  + React Native        →  + PWA
```

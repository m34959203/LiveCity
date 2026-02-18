# LiveCity — Архитектура системы

**Версия:** 0.1 (Demo)
**Дата:** 2026-02-18

---

## 1. Обзор архитектуры

Для демо-версии используется **модульный монолит** на базе Next.js. Это позволяет держать frontend и backend в одном проекте, ускоряя разработку. После демо — возможна миграция backend в отдельный сервис.

```
┌──────────────────────────────────────────────────────────┐
│                      КЛИЕНТ (Браузер)                    │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Map View   │  │ Search   │  │ Business Dashboard   │  │
│  │ (Mapbox)   │  │ (AI)     │  │ (Charts)             │  │
│  └─────┬──────┘  └────┬─────┘  └──────────┬───────────┘  │
│        │              │                    │              │
│        └──────────────┼────────────────────┘              │
│                       │ HTTP/REST                         │
└───────────────────────┼──────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────┐
│                 NEXT.JS SERVER                            │
│                       │                                  │
│  ┌────────────────────▼─────────────────────────┐        │
│  │              API ROUTES (/api/*)              │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │        │
│  │  │ /venues  │ │ /search  │ │ /dashboard   │  │        │
│  │  └────┬─────┘ └────┬─────┘ └──────┬───────┘  │        │
│  └───────┼────────────┼──────────────┼───────────┘        │
│          │            │              │                    │
│  ┌───────▼────────────▼──────────────▼───────────┐        │
│  │            SERVICE LAYER                       │        │
│  │  ┌──────────────┐  ┌──────────────────────┐   │        │
│  │  │ VenueService │  │ AIService            │   │        │
│  │  │              │  │ (Gemini Provider)    │   │        │
│  │  └──────┬───────┘  └──────────┬───────────┘   │        │
│  │         │                     │                │        │
│  │  ┌──────▼───────┐  ┌─────────▼────────────┐   │        │
│  │  │ ScoreService │  │ AnalyticsService     │   │        │
│  │  └──────┬───────┘  └──────────┬───────────┘   │        │
│  └─────────┼─────────────────────┼────────────────┘        │
│            │                     │                        │
│  ┌─────────▼─────────────────────▼────────────────┐        │
│  │              DATA LAYER (Prisma ORM)            │        │
│  └─────────────────────┬──────────────────────────┘        │
└────────────────────────┼─────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  PostgreSQL + PostGIS│
              │  (Neon Serverless)   │
              └─────────────────────┘
```

---

## 2. Структура проекта

```
livecity/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions: lint + test + build
│
├── prisma/
│   ├── schema.prisma              # Схема базы данных
│   ├── migrations/                # Миграции
│   └── seed.ts                    # Seed-данные (50-100 заведений)
│
├── public/
│   ├── images/                    # Статичные изображения
│   └── favicon.ico
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Корневой layout
│   │   ├── page.tsx               # Главная страница (карта)
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Бизнес-дашборд
│   │   └── api/                   # API Routes
│   │       ├── venues/
│   │       │   ├── route.ts       # GET /api/venues
│   │       │   └── [id]/
│   │       │       └── route.ts   # GET /api/venues/:id
│   │       ├── search/
│   │       │   └── route.ts       # POST /api/search
│   │       ├── heatmap/
│   │       │   └── route.ts       # GET /api/heatmap
│   │       └── dashboard/
│   │           └── route.ts       # GET /api/dashboard/:venueId
│   │
│   ├── components/                # React-компоненты
│   │   ├── map/
│   │   │   ├── MapView.tsx        # Основная карта
│   │   │   ├── VenueMarker.tsx    # Маркер заведения
│   │   │   ├── HeatmapLayer.tsx   # Тепловой слой
│   │   │   └── MapControls.tsx    # Контролы карты
│   │   ├── search/
│   │   │   ├── SearchBar.tsx      # Строка поиска
│   │   │   └── SearchResults.tsx  # Результаты поиска
│   │   ├── venue/
│   │   │   ├── VenueCard.tsx      # Карточка заведения
│   │   │   ├── LiveScoreBadge.tsx # Бейдж Live Score
│   │   │   └── VenueDetails.tsx   # Детальная панель
│   │   ├── dashboard/
│   │   │   ├── ScoreChart.tsx     # График Live Score
│   │   │   ├── ComplaintsList.tsx # Список жалоб
│   │   │   └── ActionPlan.tsx     # AI-рекомендации
│   │   └── ui/                    # shadcn/ui компоненты
│   │
│   ├── services/                  # Бизнес-логика
│   │   ├── venue.service.ts       # CRUD заведений + гео-запросы
│   │   ├── score.service.ts       # Расчёт Live Score
│   │   ├── ai.service.ts          # Обёртка над Gemini API
│   │   └── analytics.service.ts   # Аналитика для дашборда
│   │
│   ├── lib/                       # Утилиты
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── gemini.ts              # Gemini AI client
│   │   └── mapbox.ts              # Mapbox конфигурация
│   │
│   └── types/                     # TypeScript типы
│       ├── venue.ts
│       ├── search.ts
│       └── dashboard.ts
│
├── tests/                         # Тесты
│   ├── services/
│   └── api/
│
├── .env.example                   # Пример переменных окружения
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. Ключевые модули

### 3.1. Map Module (Карта)

**Ответственность:** Отрисовка интерактивной карты, маркеров, heatmap.

```
MapView (контейнер)
├── Mapbox GL JS (рендер карты)
├── VenueMarker[] (маркеры с Live Score)
├── HeatmapLayer (тепловой слой, toggle)
└── MapControls (zoom, geolocation, layer switch)
```

**Данные:**
- Загрузка заведений: `GET /api/venues?bounds={bbox}&limit=100`
- Heatmap: `GET /api/heatmap?bounds={bbox}`

### 3.2. Search Module (AI-поиск)

**Ответственность:** Обработка семантических запросов через Gemini.

```
Поток данных:
1. User input → SearchBar
2. POST /api/search { query: "тихое кафе", location: {lat, lng} }
3. API → AIService.semanticSearch(query, venues)
4. AIService → Gemini API (prompt + venue context)
5. Gemini → ranked venue IDs + explanations
6. API → enriched venues (DB lookup)
7. Frontend → SearchResults + map markers highlight
```

### 3.3. Score Module (Live Score)

**Ответственность:** Расчёт и кеширование рейтинга.

```
ScoreService.calculateLiveScore(venueId):
  socialSignals = getSocialMentions(venueId, last7days)    // вес 0.4
  sentiment     = getAverageSentiment(venueId, last7days)  // вес 0.3
  activity      = getCheckInActivity(venueId, last7days)   // вес 0.2
  timeModifier  = getTimeOfDayModifier(now)                // вес 0.1

  score = (socialSignals * 0.4)
        + (sentiment * 0.3)
        + (activity * 0.2)
        + (timeModifier * 0.1)

  return clamp(score, 0, 10)
```

**Для демо:** Score берётся из seed-данных + лёгкая рандомизация по времени суток.

### 3.4. Dashboard Module (Бизнес-аналитика)

**Ответственность:** Аналитика и AI-рекомендации для бизнеса.

```
GET /api/dashboard/:venueId
  → scoreHistory (30 дней)
  → topComplaints (AI-группировка)
  → actionPlan (3 AI-рекомендации)
  → districtComparison (среднее по району)
```

---

## 4. Интеграции

### 4.1. Google Gemini AI

**Использование:**
1. **Semantic Search** — ранжирование заведений по контексту запроса
2. **AI-Consulting** — генерация action plans для бизнеса
3. **Venue Description** — генерация описаний заведений

**Абстракция:**
```typescript
interface AIProvider {
  semanticSearch(query: string, venues: Venue[]): Promise<SearchResult[]>
  generateActionPlan(venueData: VenueAnalytics): Promise<ActionPlan>
  generateDescription(venue: Venue): Promise<string>
}
```

### 4.2. Mapbox

**Использование:**
- Рендер карты
- Heatmap-слой
- Геокодинг (поиск по адресу)
- Кластеризация маркеров

### 4.3. WhatsApp (Direct Connect)

**Реализация:** Простая ссылка `wa.me`, без API-интеграции.

---

## 5. Переменные окружения

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/livecity

# AI
GEMINI_API_KEY=your_gemini_api_key

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# App
NEXT_PUBLIC_DEFAULT_LAT=43.2380
NEXT_PUBLIC_DEFAULT_LNG=76.9450
NEXT_PUBLIC_DEFAULT_ZOOM=12
```

---

## 6. Эволюция после демо

```
Demo (сейчас)          →  MVP v1.0              →  Scale
─────────────────────────────────────────────────────────
Монолит Next.js        →  Отдельный API сервис  →  Микросервисы
Seed-данные            →  Реальные соцсети API  →  ML pipeline
Neon (serverless)      →  Managed PostgreSQL    →  + Redis + Elastic
Vercel                 →  Docker + VPS          →  Kubernetes
Без авторизации        →  Auth (NextAuth)       →  + OAuth + roles
Только web             →  + React Native        →  + PWA
```

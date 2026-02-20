# LiveCity

Экосистема Честного Потребления — технологический мост доверия между людьми и городскими заведениями.

**Live Score** | **AI-поиск** | **Lazy Discovery** | **AI Planner** | **Бизнес-дашборд** | **Конкурентная разведка** | **Тепловая карта**

---

## Что это?

LiveCity — платформа, где репутация места зависит не от купленных звёзд, а от пульса реальной жизни прямо сейчас. Мы уничтожаем «информационную слепоту» в городе.

### Ключевые фичи

- **Live Score** — рейтинг на основе реальных социальных сигналов (2GIS отзывы, Instagram упоминания, AI-сентимент)
- **AI Semantic Search** — поиск на естественном языке через Gemini 2.0 Flash
- **Lazy Discovery** — если заведения нет в БД, оно автоматически создаётся из OpenStreetMap
- **AI Planner** — построение маршрута дня по запросу: «Хочу провести день с семьёй, бюджет средний»
- **Бизнес-дашборд** — AI-аналитика: жалобы, action plan, история score, сравнение с районом
- **Конкурентная разведка** — SWOT-анализ vs ближайших конкурентов через Gemini
- **"The Hook"** — бесплатный AI-инсайт для привлечения бизнес-клиентов
- **Тепловая карта** — визуализация «живости» районов города
- **City Radar** — автоматическое обнаружение новых заведений через OpenStreetMap (5 городов КЗ)
- **2GIS Parser** — собственный парсер 2GIS (бесплатный, без API-ключа)

## Стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 16, TypeScript (strict), React 19, Tailwind CSS 4 |
| Карта | Mapbox GL JS (react-map-gl v8), dark-v11 стиль |
| Графики | Recharts (LineChart) |
| Backend | Next.js API Routes (App Router) |
| ORM | Prisma 6 |
| AI | Google Gemini 2.0 Flash |
| Database | PostgreSQL |
| Данные | 2GIS (собственный парсер), OpenStreetMap Overpass, Apify (опционально) |
| Тестирование | Vitest + React Testing Library |
| CI/CD | GitHub Actions (lint + typecheck + test + build) |
| Deploy | Vercel |

## Быстрый старт

```bash
# 1. Клонировать
git clone https://github.com/m34959203/LiveCity.git
cd LiveCity

# 2. Установить зависимости
npm install

# 3. Настроить окружение
cp .env.example .env.local
# Заполнить DATABASE_URL, GEMINI_API_KEY, NEXT_PUBLIC_MAPBOX_TOKEN

# 4. Сгенерировать Prisma client
npx prisma generate

# 5. Создать БД и заполнить seed-данными
npx prisma migrate dev
npm run db:seed

# 6. Запустить
npm run dev
```

Приложение доступно на `http://localhost:3000`

## Скрипты

| Команда | Назначение |
|---|---|
| `npm run dev` | Запуск dev-сервера |
| `npm run build` | Production-сборка |
| `npm run lint` | ESLint проверка |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Запуск Vitest (53 теста) |
| `npm run test:watch` | Vitest в watch-режиме |
| `npm run format` | Prettier форматирование |
| `npm run start` | Production-запуск (auto-seed + next start) |
| `npm run db:seed` | Заполнение БД seed-данными |
| `npm run db:migrate` | Prisma миграции |
| `npm run db:studio` | Prisma Studio (GUI для БД) |

### Production Startup (`scripts/start.mjs`)

Скрипт `npm run start` автоматизирует production-запуск:
1. `prisma db push --skip-generate` — синхронизация схемы БД
2. Проверка: если БД пустая → автоматический seed
3. `next start` — запуск production-сервера

## Структура проекта

```
src/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Корневой layout (lang=ru, OG-теги)
│   ├── page.tsx               # Главная: карта + поиск + venue panel
│   ├── dashboard/page.tsx     # Бизнес-дашборд с AI-аналитикой
│   ├── insights/page.tsx      # Каталог бесплатных инсайтов
│   ├── insights/[venueId]/    # "The Hook" — бесплатный AI-инсайт
│   ├── planner/page.tsx       # AI Day Planner
│   └── api/                   # REST API (15 endpoints)
│       ├── venues/            # GET /api/venues, GET /api/venues/:id
│       │   └── [id]/
│       │       ├── sync/      # POST — ручная синхронизация с 2GIS
│       │       └── pulse/     # GET — социальный пульс заведения
│       ├── search/            # POST /api/search (AI + Lazy Discovery)
│       ├── categories/        # GET /api/categories
│       ├── heatmap/           # GET /api/heatmap
│       ├── dashboard/         # GET /api/dashboard/:venueId
│       │   └── [venueId]/
│       │       └── competitors/  # GET — конкурентная разведка
│       ├── insights/          # GET /api/insights/:venueId (The Hook)
│       ├── planner/           # POST /api/planner (AI Day Planner)
│       └── cron/              # Cron-задачи (защищены CRON_SECRET)
│           ├── sync-pulse/    # Главный pipeline: 2GIS → AI → Score
│           ├── refresh-scores/  # Пересчёт Live Score
│           ├── venue-scout/   # City Radar: обнаружение через OSM
│           └── purge-seed/    # Очистка seed-данных (отключён)
│
├── components/                # 19 React-компонентов
│   ├── city/                  # CitySelector
│   ├── map/                   # MapView, VenueMarker, HeatmapLayer, MapControls, CategoryFilter
│   ├── search/                # SearchBar, SearchResults
│   ├── venue/                 # VenueCard, VenueDetails
│   ├── dashboard/             # ScoreChart, ComplaintsList, ActionPlan,
│   │                          # DistrictComparison, SocialPulse, CompetitorInsights
│   ├── layout/                # Header
│   └── ui/                    # LiveScoreBadge, ErrorBoundary
│
├── services/                  # 10 сервисов бизнес-логики
│   ├── venue.service.ts       # CRUD заведений
│   ├── score.service.ts       # Live Score: расчёт, история, средние
│   ├── social-signal.service.ts  # Сбор сигналов (2GIS, Instagram), расчёт Live Score
│   ├── ai.service.ts          # Semantic search, action plan, complaints
│   ├── ai-analyzer.service.ts # Глубокий анализ отзывов (Gemini batch)
│   ├── analytics.service.ts   # Агрегация данных для дашборда
│   ├── competitor.service.ts  # Поиск конкурентов + SWOT-анализ
│   ├── insight.service.ts     # "The Hook" — генерация бесплатных инсайтов
│   ├── planner.service.ts     # AI Day Planner
│   └── twogis.service.ts      # Собственный парсер 2GIS (бесплатный)
│
├── lib/                       # 10 утилит
│   ├── prisma.ts              # Prisma client singleton
│   ├── gemini.ts              # Gemini 2.0 Flash client
│   ├── env.ts                 # Zod-валидация env переменных
│   ├── overpass-osm.ts        # OpenStreetMap Overpass API (Lazy Discovery + City Radar)
│   ├── apify-2gis.ts          # Apify 2GIS интеграция (legacy)
│   ├── google-places.ts       # Google Places API (опционально)
│   ├── cities.ts              # Конфигурация 5 городов КЗ
│   ├── rate-limit.ts          # Rate limiting middleware
│   ├── logger.ts              # Логирование
│   └── format.ts              # Утилиты форматирования
│
├── types/                     # TypeScript типы
│   ├── venue.ts               # VenueListItem, VenueDetail, VenueFilters
│   ├── search.ts              # SearchRequest, SearchResultItem, SearchResponse
│   └── dashboard.ts           # DashboardData, Complaint, ActionPlanItem
│
└── __tests__/                 # 53 Vitest теста (8 файлов)
    ├── setup.ts               # jest-dom + cleanup
    ├── services/              # ScoreService, AIService
    ├── components/            # LiveScoreBadge, ComplaintsList, ActionPlan, DistrictComparison
    └── types/                 # Type contracts
```

## Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `DATABASE_URL` | Да | PostgreSQL connection string |
| `GEMINI_API_KEY` | Да | Google AI Studio API key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Да | Mapbox GL JS token |
| `CRON_SECRET` | Да | Защита cron-эндпоинтов |
| `APIFY_TOKEN` | Нет | Apify token (для Instagram-скрапинга) |
| `DEFAULT_CITY` | Нет | Город по умолчанию (default: Алматы) |
| `NEXT_PUBLIC_DEFAULT_LAT` | Нет | Центр карты: широта |
| `NEXT_PUBLIC_DEFAULT_LNG` | Нет | Центр карты: долгота |
| `NEXT_PUBLIC_DEFAULT_ZOOM` | Нет | Зум карты по умолчанию |

## Документация

| Документ | Описание |
|---|---|
| [Vision](docs/VISION.md) | Фундаментальная концепция проекта |
| [MVP Spec](docs/MVP_SPEC.md) | Спецификация: 7 MVP-фич + 6 расширенных фич |
| [Architecture](docs/ARCHITECTURE.md) | Архитектура: модули, сервисы, data flow, интеграции |
| [Tech Stack (ADR)](docs/ADR-001-TECH-STACK.md) | Решение по выбору технологий |
| [Database Schema](docs/DATABASE_SCHEMA.md) | Prisma schema (7 моделей), 21 поле Venue |
| [API Spec](docs/API_SPEC.md) | REST API — 15 эндпоинтов (11 public + 4 cron) |
| [Roadmap](docs/ROADMAP.md) | Дорожная карта: 7 фаз (5 базовых + 2 расширения) |
| [Phase Reports](docs/) | REPORT-PHASE1..5 — отчёты по фазам |

## Демо-сценарий (3 мин)

1. **Карта** (30с): Открыть `/` — маркеры заведений, выбор города, включить heatmap
2. **AI-поиск** (30с): Ввести «тихое кафе с Wi-Fi» — AI-результаты с объяснениями
3. **Lazy Discovery** (20с): Ввести редкий запрос — система находит через OpenStreetMap
4. **Заведение** (30с): Кликнуть маркер — панель с score, тегами, отзывами, WhatsApp
5. **Дашборд** (30с): `/dashboard` — график score, жалобы, AI-план, конкуренты
6. **The Hook** (20с): `/insights` — бесплатный AI-инсайт «Вы теряете гостей. Вот почему.»
7. **AI Planner** (20с): `/planner` — «День с семьёй, бюджет средний» → маршрут дня

## Лицензия

Proprietary. All rights reserved.

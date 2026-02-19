# LiveCity

Экосистема Честного Потребления — технологический мост доверия между людьми и городскими заведениями.

**Live Score** | **AI-поиск** | **Тепловая карта** | **Бизнес-аналитика**

---

## Что это?

LiveCity — платформа, где репутация места зависит не от купленных звёзд, а от пульса реальной жизни прямо сейчас. Мы уничтожаем «информационную слепоту» в городе.

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
| `npm test` | Запуск Vitest (37 тестов) |
| `npm run test:watch` | Vitest в watch-режиме |
| `npm run format` | Prettier форматирование |
| `npm run db:seed` | Заполнение БД seed-данными (70 заведений) |
| `npm run db:migrate` | Prisma миграции |
| `npm run db:studio` | Prisma Studio (GUI для БД) |

## Структура проекта

```
src/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Корневой layout (lang=ru, OG-теги)
│   ├── page.tsx               # Главная: карта + поиск + venue panel
│   ├── dashboard/
│   │   └── page.tsx           # Бизнес-дашборд с AI-аналитикой
│   └── api/                   # REST API (6 endpoints)
│       ├── venues/            # GET /api/venues, GET /api/venues/:id
│       ├── categories/        # GET /api/categories
│       ├── heatmap/           # GET /api/heatmap
│       ├── search/            # POST /api/search (AI)
│       └── dashboard/         # GET /api/dashboard/:venueId
│
├── components/                # 12 React-компонентов
│   ├── map/                   # MapView, VenueMarker, HeatmapLayer, MapControls
│   ├── search/                # SearchBar, SearchResults
│   ├── venue/                 # VenueCard, VenueDetails
│   ├── dashboard/             # ScoreChart, ComplaintsList, ActionPlan, DistrictComparison
│   ├── layout/                # Header
│   └── ui/                    # LiveScoreBadge
│
├── services/                  # 4 сервиса бизнес-логики
│   ├── venue.service.ts       # getAll, getById, getByBounds
│   ├── score.service.ts       # calculateDemoScore, refreshAllScores, getHistory
│   ├── ai.service.ts          # semanticSearch (Gemini), generateActionPlan, groupComplaints
│   └── analytics.service.ts   # getDashboardData
│
├── lib/                       # Утилиты
│   ├── prisma.ts              # Prisma client singleton
│   ├── gemini.ts              # Gemini 2.0 Flash client
│   └── env.ts                 # Zod-валидация env переменных
│
├── types/                     # TypeScript типы
│   ├── venue.ts               # VenueListItem, VenueDetail, VenueFilters
│   ├── search.ts              # SearchRequest, SearchResultItem, SearchResponse
│   └── dashboard.ts           # DashboardData, Complaint, ActionPlanItem
│
└── __tests__/                 # 37 Vitest тестов
    ├── setup.ts               # jest-dom + cleanup
    ├── services/              # ScoreService (5), AIService (7)
    ├── components/            # LiveScoreBadge, ComplaintsList, ActionPlan, DistrictComparison
    └── types/                 # Type contracts (5)
```

## Документация

| Документ | Описание |
|---|---|
| [Vision](docs/VISION.md) | Фундаментальная концепция проекта |
| [MVP Spec](docs/MVP_SPEC.md) | Спецификация демо-версии (7 фич, user flows) |
| [Architecture](docs/ARCHITECTURE.md) | Архитектура системы, модули, компоненты |
| [Tech Stack (ADR)](docs/ADR-001-TECH-STACK.md) | Решение по выбору технологий |
| [Database Schema](docs/DATABASE_SCHEMA.md) | Prisma schema (7 моделей), seed-данные |
| [API Spec](docs/API_SPEC.md) | REST API — 6 эндпоинтов |
| [Roadmap](docs/ROADMAP.md) | Дорожная карта: 5 фаз (все завершены) |
| [Phase Reports](docs/) | REPORT-PHASE1..5 — отчёты по фазам |

## Демо-сценарий (2 мин)

1. **Карта** (30с): Открыть `/` — маркеры 70 заведений Алматы, включить heatmap
2. **AI-поиск** (30с): Ввести «тихое кафе с Wi-Fi» — AI-результаты с объяснениями
3. **Заведение** (30с): Кликнуть маркер — панель с score, тегами, отзывами, WhatsApp
4. **Дашборд** (30с): `/dashboard` — график score, жалобы, AI-план, сравнение с районом

## Лицензия

Proprietary. All rights reserved.

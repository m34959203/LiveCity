# LiveCity

Экосистема Честного Потребления — технологический мост доверия между людьми и городскими заведениями.

**Live Score** | **AI-поиск** | **Тепловая карта** | **Бизнес-аналитика**

---

## Что это?

LiveCity — платформа, где репутация места зависит не от купленных звёзд, а от пульса реальной жизни прямо сейчас. Мы уничтожаем «информационную слепоту» в городе.

## Стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 14, TypeScript, React 18, Tailwind CSS, shadcn/ui |
| Карта | Mapbox GL JS (react-map-gl) |
| Backend | Next.js API Routes, Prisma ORM |
| AI | Google Gemini API |
| Database | PostgreSQL + PostGIS (Neon) |
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

# 4. Создать БД и заполнить seed-данными
npx prisma migrate dev
npm run db:seed

# 5. Запустить
npm run dev
```

Приложение доступно на `http://localhost:3000`

## Документация

| Документ | Описание |
|---|---|
| [Vision](docs/VISION.md) | Фундаментальная концепция проекта |
| [MVP Spec](docs/MVP_SPEC.md) | Спецификация демо-версии (scope, фичи, user flows) |
| [Architecture](docs/ARCHITECTURE.md) | Архитектура системы, модули, структура проекта |
| [Tech Stack (ADR)](docs/ADR-001-TECH-STACK.md) | Решение по выбору технологий с обоснованиями |
| [Database Schema](docs/DATABASE_SCHEMA.md) | Схема БД, Prisma schema, ключевые запросы |
| [API Spec](docs/API_SPEC.md) | REST API — эндпоинты, форматы запросов/ответов |
| [Roadmap](docs/ROADMAP.md) | Дорожная карта: 5 фаз, 15 эпиков, 41 задача, 122 подзадачи |

## Структура проекта

```
src/
├── app/                  # Next.js App Router (страницы + API)
│   ├── page.tsx          # Главная (карта)
│   ├── dashboard/        # Бизнес-дашборд
│   └── api/              # REST API endpoints
├── components/           # React-компоненты (map, search, venue, dashboard, ui)
├── services/             # Бизнес-логика (venue, score, ai, analytics)
├── lib/                  # Утилиты (prisma, gemini, mapbox)
└── types/                # TypeScript типы
```

## Лицензия

Proprietary. All rights reserved.

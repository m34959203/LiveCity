# LiveCity — Отчёт о состоянии разработки проекта

**Дата аудита:** 19 февраля 2026
**Версия отчёта:** 2.0
**Проводил:** Команда технического аудита

---

## 0. Резюме (Executive Summary)

**Общая оценка: Проект находится на стадии «Demo-Ready MVP».**

Все 5 фаз разработки завершены. Репозиторий содержит полноценное веб-приложение: 6 API-эндпоинтов, 14 React-компонентов, 4 сервиса бизнес-логики, 37 Vitest-тестов, CI/CD pipeline и 70 seed-заведений Алматы. Проект собирается, тесты проходят, деплой автоматизирован.

| Метрика | Значение |
|---|---|
| Строк исходного кода | ~817+ (core application) |
| Файлов в src/ | 30+ |
| API-эндпоинтов | 6 |
| React-компонентов | 14 |
| Сервисов бизнес-логики | 4 |
| Моделей БД (Prisma) | 7 |
| Тестов (Vitest) | 37 (100% pass) |
| CI/CD jobs | 3 (Lint, Tests, Build) |
| Seed-данных | 70 заведений, 6 категорий, 12 тегов |
| Зависимостей (prod) | 12 |
| Зависимостей (dev) | 11 |

---

## 1. Структура репозитория

```
LiveCity/
├── .github/workflows/ci.yml      # 3 CI jobs: lint+typecheck, tests, build
├── prisma/
│   ├── schema.prisma              # 7 моделей PostgreSQL
│   └── seed.ts                    # 70 заведений Алматы + reviews + history
├── scripts/
│   └── start.mjs                  # Auto-seed + production start
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (lang=ru, OG-теги)
│   │   ├── page.tsx               # Главная: карта + поиск + venue panel
│   │   ├── dashboard/page.tsx     # Бизнес-дашборд с AI-аналитикой
│   │   └── api/                   # 6 REST API endpoints
│   ├── components/                # 14 React-компонентов
│   ├── services/                  # 4 сервиса (Venue, Score, AI, Analytics)
│   ├── lib/                       # prisma.ts, gemini.ts, env.ts
│   ├── types/                     # TypeScript типы (venue, search, dashboard)
│   └── __tests__/                 # 37 Vitest тестов
├── docs/                          # 13 документов
├── package.json
├── tsconfig.json (strict: true)
├── vitest.config.ts
├── .prettierrc
├── .gitignore
└── .env.example
```

---

## 2. Технологический стек

### Статус: ОПРЕДЕЛЁН И РЕАЛИЗОВАН (ADR-001)

| Категория | Технология | Версия |
|---|---|---|
| Frontend | Next.js (App Router) + React | 16.1.6 / 19.2.3 |
| Язык | TypeScript (strict mode) | 5.x |
| Стили | Tailwind CSS | 4.x |
| Карта | Mapbox GL JS + react-map-gl | 3.18.1 / 8.1.0 |
| Графики | Recharts | 3.7.0 |
| Backend | Next.js API Routes | 16.1.6 |
| ORM | Prisma | 6.19.2 |
| БД | PostgreSQL | — |
| AI | Google Gemini 2.0 Flash | 0.24.1 |
| Валидация | Zod | 4.3.6 |
| Тесты | Vitest + React Testing Library | 4.0.18 / 16.3.2 |
| CI/CD | GitHub Actions | 3 jobs |
| Форматирование | Prettier + ESLint | 3.8.1 / 9.x |

---

## 3. Качество кода

### 3.1. Линтинг и форматирование
- ESLint (Next.js preset + Core Web Vitals): **0 ошибок**
- Prettier: все файлы отформатированы
- TypeScript strict mode: **0 ошибок**

### 3.2. Архитектурные паттерны
- Модульный монолит (App Router)
- Service Layer (VenueService, ScoreService, AIService, AnalyticsService)
- Stateless сервисы с dependency injection через параметры
- Prisma singleton для connection pooling
- Zod для runtime-валидации окружения

### 3.3. Обработка ошибок
- Try-catch на всех API-эндпоинтах
- Единый формат ошибок: `{ error: { code, message } }`
- HTTP-коды: 200, 400, 404, 500
- Fallback-данные при ошибке Gemini AI

### 3.4. Известные технические долги
- Нет Rate Limiting на API
- Нет аутентификации (ожидаемо для demo)
- `console.error` вместо структурированного логгера
- Нет Cache-Control заголовков
- Отсутствует AbortController в VenueDetails (risk: memory leak)
- Нет Error Boundary вокруг MapView

---

## 4. Тестирование

| Тип тестов | Наличие | Количество |
|---|---|---|
| Unit-тесты (сервисы) | Да | 12 (ScoreService: 5, AIService: 7) |
| Unit-тесты (компоненты) | Да | 20 (LiveScoreBadge: 6, ActionPlan: 5, ComplaintsList: 5, DistrictComparison: 4) |
| Type contract тесты | Да | 5 |
| Интеграционные тесты | Нет | 0 |
| E2E-тесты | Нет | 0 |
| **Итого** | **37** | **100% pass** |

Фреймворк: Vitest 4.0.18 + React Testing Library + jsdom
Запуск: `npm test` (single run), `npm run test:watch` (watch mode)

---

## 5. CI/CD и DevOps

| Инструмент | Наличие | Детали |
|---|---|---|
| GitHub Actions | Да | 3 jobs: Lint & Typecheck, Tests, Build |
| Triggers | Да | Push main/claude/**, PR to main |
| Node caching | Да | node_modules кеширование |
| Docker | Нет | Не требуется для Vercel/Railway |
| Мониторинг | Нет | Рекомендация: добавить Sentry |
| Staging среда | Нет | — |

### Production Startup
Скрипт `scripts/start.mjs` автоматизирует:
1. `prisma db push --skip-generate` — синхронизация схемы
2. Проверка: если БД пустая → автоматический seed
3. `next start` — запуск production-сервера

---

## 6. Безопасность

| Проверка | Статус |
|---|---|
| Нет .env в репозитории | Да |
| .gitignore настроен | Да |
| Нет хардкоженных секретов | Да |
| SQL injection (Prisma ORM) | Защищено |
| XSS (React auto-escape) | Защищено |
| Zod-валидация env | Да |
| Rate Limiting | **Нет** |
| Аутентификация | **Нет** (by design для demo) |
| CORS | **Не настроен** |
| CSP заголовки | **Нет** |

---

## 7. Функциональность (MVP-scope)

| # | Фича | Статус | Реализация |
|---|---|---|---|
| F1 | Интерактивная карта | Done | Mapbox dark-v11, 70 маркеров, zoom/geolocation |
| F2 | Live Score | Done | ScoreService + time/weekend/jitter модификаторы |
| F3 | AI Semantic Search | Done | Gemini 2.0 Flash + текстовый fallback |
| F4 | Тепловая карта | Done | GeoJSON heatmap layer + toggle |
| F5 | Карточка заведения | Done | Desktop side panel + mobile bottom sheet |
| F6 | Бизнес-дашборд | Done | ScoreChart, Complaints, ActionPlan, District |
| F7 | WhatsApp Direct Connect | Done | wa.me link в VenueDetails |

---

## 8. Git-история и активность

### 8.1. Ветвление
- `main` — основная ветка
- `claude/*` — feature-ветки для AI-ассистированной разработки
- PR workflow: feature branch → PR → merge to main

### 8.2. Процессы
- Pull Requests используются для всех изменений
- GitHub Actions проверяют каждый PR (lint + test + build)
- Все 5 фаз разработки прошли через PR-процесс

---

## 9. Зрелость проекта по модели CMMI

| Уровень | Описание | Статус |
|---|---|---|
| Level 1 — Initial | Процессы хаотичны | Пройден |
| Level 2 — Managed | Базовое управление проектом | **← Текущий уровень** |
| Level 3 — Defined | Стандартизированные процессы | Частично (CI/CD, но нет staging) |
| Level 4 — Quantitatively Managed | Измеримые процессы | Не достигнут |
| Level 5 — Optimizing | Непрерывное улучшение | Не достигнут |

---

## 10. Карта рисков (актуальная)

| Риск | Вероятность | Влияние | Описание |
|---|---|---|---|
| Нет аутентификации | Средняя | Высокое | API открыт — ок для demo, критично для production |
| Зависимость от Gemini API | Средняя | Среднее | Есть fallback, но один AI-провайдер |
| Нет Rate Limiting | Высокая | Среднее | Gemini API может быть исчерпан |
| Один разработчик | Высокая | Высокое | Bus factor = 1 |
| Нет мониторинга | Средняя | Среднее | Ошибки в production не отслеживаются |
| Нет кеширования | Средняя | Низкое | Каждый запрос = запрос к БД |

---

## 11. Рекомендации по приоритету

### Для production-ready (приоритет 1)
1. Добавить аутентификацию (NextAuth или API-ключи)
2. Добавить Rate Limiting на API-эндпоинты
3. Настроить структурированное логирование (Pino/Winston)
4. Добавить Error Boundary вокруг MapView
5. Добавить AbortController в VenueDetails

### Для масштабирования (приоритет 2)
6. Добавить Redis для кеширования venues и heatmap
7. Настроить мониторинг (Sentry для ошибок)
8. Добавить интеграционные и E2E-тесты
9. Настроить staging-среду
10. Добавить OpenAPI/Swagger документацию

### Для роста команды (приоритет 3)
11. Добавить CONTRIBUTING.md
12. Настроить Docker для локальной разработки
13. Добавить pre-commit hooks (husky + lint-staged)

---

## 12. Заключение

LiveCity — проект с **сильной продуктовой концепцией и качественной реализацией MVP**. Все 7 запланированных фич реализованы, 37 тестов проходят, CI/CD настроен, код чистый и типизированный. Проект готов для демонстрации инвесторам/партнёрам.

**Главный вызов проекта:** перейти от demo к production — добавить аутентификацию, Rate Limiting и мониторинг.

**Готовность к демонстрации:** Да.
**Готовность к production:** Требуется доработка (безопасность, мониторинг).

---

*Отчёт подготовлен на основе полного анализа репозитория LiveCity на дату 19.02.2026.*

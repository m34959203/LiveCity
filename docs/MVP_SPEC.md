# LiveCity — Спецификация функций

**Цель документа:** Описание всех реализованных функций платформы.
**Обновлено:** 2026-02-20
**Статус:** 13 фич реализовано (7 MVP + 6 расширенных)

---

## 1. Цель демонстрации

Показать инвесторам/партнёрам работающую платформу, которая:
- Отображает карту города с заведениями и их Live Score
- Позволяет искать заведения на естественном языке через AI
- Автоматически находит новые заведения через OpenStreetMap (Lazy Discovery)
- Планирует маршрут дня через AI Planner
- Визуализирует тепловую карту активности
- Даёт бизнесу полный дашборд с аналитикой и конкурентной разведкой
- Привлекает бизнес через бесплатные AI-инсайты ("The Hook")

**Демо-сценарий (3 минуты):**
> «Я турист в Алматы. Открываю LiveCity — вижу карту с живыми точками. Спрашиваю: "Где вкусный плов в тихом месте с парковкой?" — AI выдаёт лучшие варианты с Live Score. Если чего-то нет в базе — система находит через OpenStreetMap. Нажимаю на место — вижу карточку с рейтингом, отзывами, WhatsApp. Переключаюсь на тепловую карту — вижу, где сейчас движуха. Открываю AI Planner — строю маршрут дня. Захожу в /insights — вижу, как привлечь владельцев бизнеса бесплатным анализом.»

---

## 2. MVP-фичи (изначальный scope)

| # | Фича | Статус | Реализация |
|---|---|---|---|
| F1 | Интерактивная карта с заведениями | Done | Mapbox dark-v11, 5 городов КЗ, CitySelector |
| F2 | Live Score для каждого заведения | Done | SocialSignalService + 2GIS + Instagram + Gemini |
| F3 | Semantic AI Search + Lazy Discovery | Done | Gemini 2.0 Flash + keyword fallback + OSM Overpass |
| F4 | Тепловая карта активности | Done | GeoJSON heatmap layer (toggle) |
| F5 | Карточка заведения (детали) | Done | Bottom sheet (mobile) / side panel (desktop) |
| F6 | Бизнес-дашборд (полный) | Done | Score, Complaints, ActionPlan, District, Pulse, Competitors |
| F7 | Кнопка Direct Connect (WhatsApp) | Done | wa.me link с предзаполненным текстом |

## 3. Расширенные фичи (реализованы сверх MVP)

| # | Фича | Статус | Реализация |
|---|---|---|---|
| F8 | AI Day Planner | Done | POST /api/planner, страница /planner |
| F9 | Конкурентная разведка (SWOT) | Done | GET /api/dashboard/:id/competitors |
| F10 | "The Hook" (бесплатные инсайты) | Done | /insights/[venueId], InsightService |
| F11 | City Radar (авто-обнаружение) | Done | Cron venue-scout, OpenStreetMap |
| F12 | Собственный 2GIS парсер | Done | TwoGisService (бесплатный) |
| F13 | 3-Mode Sync Pipeline | Done | Apify / 2GIS parser / OSM-only |

---

## 4. Детальная спецификация фич

### F1: Интерактивная карта города

**Компоненты:** `MapView`, `VenueMarker`, `HeatmapLayer`, `MapControls`, `CategoryFilter`, `CitySelector`

- Полноэкранная карта Mapbox (стиль `dark-v11`)
- `react-map-gl/mapbox` v8, dynamic import (SSR disabled)
- 5 городов КЗ: Алматы, Астана, Шымкент, Караганда, Жезказган
- Маркеры с цветовой индикацией Live Score:
  - Зелёный (≥8): горячее место
  - Жёлтый (≥5): нормальная активность
  - Серый (<5): мало активности
- Контролы: zoom ±, geolocation, heatmap toggle, category filter
- Auto-refresh: venues обновляются каждые 2 минуты

### F2: Live Score (Truth Filter)

**Формула:** `score = base×0.4 + activity×0.3 + sentiment×0.2 + time×0.1`

- `SocialSignalService.calculateLiveScore()`:
  - **base** — средний рейтинг из 2GIS отзывов
  - **activity** — количество упоминаний за 7 дней (нормализовано)
  - **sentiment** — средний сентимент (AI-анализ через Gemini)
  - **time** — модификатор времени суток (lunch, dinner, night)
- Fallback: при отсутствии сигналов — baseline по категории
- `LiveScoreBadge` компонент: 3 размера (sm/md/lg), 3 цвета (emerald/amber/zinc)
- Cron `refresh-scores`: пересчёт каждые 15 минут
- Cron `sync-pulse`: сбор данных каждые 6-12 часов

### F3: Semantic AI Search + Lazy Discovery

**3-ступенчатый поиск:**

1. **AI Semantic Search** — `AIService.semanticSearch()`:
   - Gemini получает запрос + JSON заведений (с social pulse данными)
   - Возвращает top-N с relevance score и объяснением
2. **Keyword Fallback** — `AIService.keywordSearch()`:
   - Текстовый поиск по названию/категории/тегам при ошибке Gemini
3. **Lazy Discovery** — если 0 результатов:
   - Запрос в OpenStreetMap Overpass по ключевым словам
   - Автосоздание venue в БД с начальным score
   - Отдача пользователю (cron `sync-pulse` потом обогатит данные)

**Компоненты:** `SearchBar` (floating input + 4 example chips), `SearchResults` (панель с VenueCard + AI reasons)

### F4: Тепловая карта

- `HeatmapLayer`: GeoJSON Source из координат venues + Mapbox `heatmap` layer type
- Toggle-кнопка «Маркеры / Тепловая карта» в MapControls
- `GET /api/heatmap`: агрегация по grid buckets (resolution: low/medium/high)

### F5: Карточка заведения

- `VenueDetails` (useReducer для state management):
  - Desktop: side panel (right, max-w-sm)
  - Mobile: bottom sheet (max-h-70vh, rounded-t-2xl)
- Поля: Live Score badge, категория, адрес, теги, AI-описание, часы работы, контакты (phone, email, website, Instagram), отзывы (последние 10), WhatsApp кнопка, Social Pulse
- Данные из: `GET /api/venues/:id` + `GET /api/venues/:id/pulse`
- Закрытие: кнопка X или Escape

### F6: Бизнес-дашборд

**Страница:** `/dashboard`

- **Venue Selector** — выбор заведения (dropdown)
- **Live Score Badge** + Quick Stats (mentions/week, sentiment, city avg)
- **AI Analysis** — strong/weak points, sentiment trend
- **ScoreChart** — Recharts LineChart, 30 дней Score History
- **SocialPulse** — breakdown по источникам (2GIS, Instagram)
- **DistrictComparison** — Score vs район (ср.) vs город (ср.) + место в районе
- **ComplaintsList** — AI-сгруппированные жалобы с % и трендами
- **ActionPlan** — 3 AI-рекомендации с priority, impact, difficulty
- **CompetitorInsights** — SWOT-анализ vs ближайших конкурентов (full-width)
- Skeleton loader при загрузке, error state при ошибке

### F7: Direct Connect (WhatsApp)

- Ссылка `wa.me/{phone}?text={encoded}` в VenueDetails
- Текст: «Привет! Пишу из LiveCity по поводу {venue.name}»
- Контактные данные извлекаются из 2GIS парсера

### F8: AI Day Planner

**Страница:** `/planner`

- Textarea для natural language input
- Preference chips: groupType (friends, family, couple, solo), budget (low, medium, high)
- Example quick-start buttons
- `POST /api/planner` → `PlannerService.planDay()`:
  - Gemini строит оптимизированный маршрут (3-6 заведений)
  - Учитывает: логистику, Live Score, operating hours, бюджет, состав группы
- Output: timeline с venue cards, estimated duration, budget per person

### F9: Конкурентная разведка (SWOT)

- `GET /api/dashboard/:venueId/competitors` → `CompetitorService`
- Поиск конкурентов: та же категория, радиус 2 км
- AI-анализ: strengths, weaknesses, opportunities
- `CompetitorInsights` компонент в дашборде

### F10: "The Hook" (бесплатные инсайты)

**Страницы:** `/insights`, `/insights/[venueId]`

- `/insights` — каталог всех заведений со Live Score badge
- `/insights/[venueId]` — бесплатный AI-инсайт:
  - Hook (проблема): «Вы теряете гостей. Вот почему.»
  - Problems list (из отзывов)
  - Quick Wins (actionable fixes)
  - Estimated Revenue Loss
  - CTA: «Попробовать полный дашборд бесплатно (7 дней)»
- API: `GET /api/insights/:venueId` — публичный, без auth (rate limit: 10 req/min)

### F11: City Radar (авто-обнаружение)

- Cron `venue-scout`: еженедельно (воскресенье)
- 5 городов КЗ: Алматы, Астана, Шымкент, Караганда, Жезказган
- OpenStreetMap Overpass: загрузка всех типов заведений
- Дедупликация по name + slug
- Новые заведения подхватываются `sync-pulse` для AI-обогащения

### F12: Собственный 2GIS парсер

- `TwoGisService` — бесплатный парсер (без API-ключа)
- Извлекает: адрес, телефон, email, сайт, соцсети, часы работы, фото, рубрики, features
- Отзывы: текст, рейтинг, автор (20 отзывов на venue)
- Заменяет платный Apify для 2GIS данных

### F13: 3-Mode Sync Pipeline

Cron `sync-pulse` — главный data pipeline:
- **Mode A:** Apify 2GIS Reviews (legacy, batch: 10)
- **Mode B:** Собственный 2GIS парсер (default, batch: 30)
- **Mode C:** OSM-only fallback (batch: 100)
- Автовыбор по env-переменным
- Pipeline per venue: search 2GIS → fetch reviews → AI analyze → recalculate score → update AI description
- Stale threshold: 24 часа

---

## 5. Пользовательские сценарии

### Flow 1: Поиск места (основной)
```
/ → Карта с маркерами (выбор города)
  → Ввод запроса в SearchBar (или клик на chip)
  → AI возвращает результаты с reasons
  → (если 0 результатов → Lazy Discovery через OSM)
  → Клик на результат → VenueDetails panel
  → Клик «WhatsApp» → wa.me
```

### Flow 2: Обзор активности
```
/ → Карта с маркерами
  → Клик «Heatmap» → тепловой слой
  → Клик на зону → zoom
  → Клик на маркер → VenueDetails
```

### Flow 3: Планирование дня
```
/planner → Ввод запроса (или example button)
  → Выбор preferences (группа, бюджет)
  → AI строит маршрут (3-6 заведений)
  → Timeline с venue cards
```

### Flow 4: Бизнес-аналитика
```
/dashboard → Выбор заведения
  → Score History (30 дней)
  → AI Analysis + Social Pulse
  → Complaints + Action Plan
  → Competitors (SWOT)
```

### Flow 5: "The Hook" (привлечение бизнеса)
```
/insights → Каталог заведений
  → /insights/[venueId] → Бесплатный инсайт
  → Hook + Problems + Quick Wins
  → CTA → /dashboard (полный дашборд)
```

---

## 6. Нефункциональные требования

| Параметр | Требование | Статус |
|---|---|---|
| Время загрузки | < 3 сек (First Contentful Paint) | Done |
| AI-ответ | < 5 сек | Done (Gemini 2.0 Flash) |
| Браузеры | Chrome, Safari (desktop + mobile) | Done |
| Мобильная адаптация | Responsive (bottom sheets, full-width panels) | Done |
| Данные | Seed + автообнаружение через OSM + 2GIS парсер | Done |
| Города | 5 городов КЗ (Алматы, Астана, Шымкент, Караганда, Жезказган) | Done |
| Язык интерфейса | Русский | Done |
| Тестирование | 53 unit теста (Vitest, 8 файлов) | Done |
| CI/CD | Lint + Typecheck + Tests + Build | Done |
| Rate Limiting | 60 req/min (venues), 5 req/min (sync), 10 req/min (insights) | Done |

---

## 7. Критерии приёмки (Definition of Done)

- [x] Карта загружается с маркерами заведений за < 3 секунд
- [x] Live Score основан на реальных данных (2GIS + Instagram + AI sentiment)
- [x] AI-поиск обрабатывает запрос на русском языке и возвращает релевантные результаты
- [x] Lazy Discovery находит заведения через OSM если ничего нет в БД
- [x] Тепловая карта переключается и отображает зоны активности
- [x] Карточка заведения показывает все поля (название, score, адрес, отзывы, контакты)
- [x] Кнопка WhatsApp открывает мессенджер с предзаполненным текстом
- [x] AI Planner строит маршрут дня из естественного языка
- [x] Бизнес-дашборд показывает график, жалобы, AI-план, конкурентов
- [x] "The Hook" генерирует бесплатный инсайт с CTA
- [x] City Radar обнаруживает новые заведения через OSM
- [x] 2GIS парсер извлекает данные без API-ключа
- [x] Mobile responsive: bottom sheet, full-width search
- [x] 53 теста проходят
- [x] CI pipeline (lint + typecheck + test + build) проходит

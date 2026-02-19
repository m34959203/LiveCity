# LiveCity — Спецификация MVP (Demo v1.0)

**Цель документа:** Определить минимальный объём функций для первой публичной демонстрации.
**Обновлено:** 2026-02-18
**Статус:** Все фичи реализованы

---

## 1. Цель демонстрации

Показать инвесторам/партнёрам работающий прототип, который:
- Отображает карту города с заведениями и их Live Score
- Позволяет искать заведения на естественном языке через AI
- Визуализирует тепловую карту активности
- Даёт бизнесу базовый дашборд с аналитикой

**Демо-сценарий (2 минуты):**
> «Я турист в Алматы. Открываю LiveCity — вижу карту с живыми точками. Спрашиваю: "Где вкусный плов в тихом месте с парковкой?" — AI выдаёт 3 лучших варианта с Live Score. Нажимаю на место — вижу карточку с реальным рейтингом, отзывами, ссылку на WhatsApp. Переключаюсь на тепловую карту — вижу, где сейчас движуха.»

---

## 2. Scope демо-версии

### IN SCOPE (реализовано)

| # | Фича | Статус | Реализация |
|---|---|---|---|
| F1 | Интерактивная карта с заведениями | Done | Mapbox dark-v11, 70 маркеров |
| F2 | Live Score для каждого заведения | Done | ScoreService + time/weekend modifiers |
| F3 | Semantic AI Search | Done | Gemini 2.0 Flash + fallback |
| F4 | Тепловая карта активности | Done | GeoJSON heatmap layer (toggle) |
| F5 | Карточка заведения (детали) | Done | Bottom sheet (mobile) / side panel (desktop) |
| F6 | Бизнес-дашборд (базовый) | Done | ScoreChart, Complaints, ActionPlan, District |
| F7 | Кнопка Direct Connect (WhatsApp) | Done | wa.me link с предзаполненным текстом |

### OUT OF SCOPE (не делаем для демо)

| Фича | Причина |
|---|---|
| AI Planner (PRO) | Post-demo |
| Spyglass (конкурентная разведка) | Требует массива данных |
| The Hook (проактивное вовлечение) | Маркетинговая фича |
| Авторизация/регистрация | Демо без аккаунтов |
| Мобильное приложение | Демо в браузере (но mobile responsive) |
| Оплата/подписки | Не нужно для демо |

---

## 3. Детальная спецификация фич

### F1: Интерактивная карта города

**Реализация:**
- Полноэкранная карта Mapbox (стиль `dark-v11`), центр на Алматы
- `react-map-gl/mapbox` v8, dynamic import (SSR disabled)
- 70 маркеров с цветовой индикацией Live Score:
  - Зелёный (≥8): горячее место
  - Жёлтый (≥5): нормальная активность
  - Серый (<5): мало активности
- Контролы: zoom ±, geolocation, heatmap toggle

**Данные:** 70 заведений Алматы (20 ресторанов, 15 кафе, 10 баров, 10 парков, 8 ТРЦ, 7 развлечений).

### F2: Live Score

**Реализация:**
- `ScoreService.calculateDemoScore(baseScore)`:
  - Time modifier: lunch +0.3, dinner +0.5, night -0.4
  - Weekend modifier: +0.3
  - Random jitter: ±0.3
  - Clamp: 0-10, round to 1 decimal
- `LiveScoreBadge` компонент: 3 размера (sm/md/lg), 3 цвета (emerald/amber/zinc)

### F3: Semantic AI Search

**Реализация:**
- `SearchBar`: floating input + 4 example chips
- `POST /api/search` → `AIService.semanticSearch()` → Gemini 2.0 Flash
- Gemini получает: запрос + JSON со 100 заведениями (id, name, category, address, score, tags)
- Возвращает: interpretation + top-5 results с relevance и reason
- `SearchResults`: выезжающая панель с VenueCard и AI-reasons
- Fallback: текстовый поиск при ошибке Gemini

### F4: Тепловая карта

**Реализация:**
- `HeatmapLayer`: GeoJSON Source из координат venues + Mapbox `heatmap` layer type
- Toggle-кнопка «Маркеры / Тепловая карта» в MapControls
- Данные: реальные координаты и scores из БД

### F5: Карточка заведения

**Реализация:**
- `VenueDetails` (useReducer для state management):
  - Desktop: side panel (right, max-w-sm)
  - Mobile: bottom sheet (max-h-70vh, rounded-t-2xl)
- Поля: Live Score badge, категория (цветной тег), адрес, теги, AI-описание, часы работы, отзывы (5 шт), WhatsApp кнопка
- Загрузка: `GET /api/venues/:id`
- Закрытие: кнопка X или Escape

### F6: Бизнес-дашборд

**Реализация:** страница `/dashboard`
- `ScoreChart`: Recharts LineChart — 30 дней Score History
- `ComplaintsList`: AI-сгруппированные жалобы с % и трендами (rising/stable/declining)
- `ActionPlan`: 3 AI-рекомендации с priority, impact, difficulty (Легко/Средне/Сложно)
- `DistrictComparison`: Score vs район (ср.) vs город (ср.) + место в районе
- Skeleton loader при загрузке, error state при ошибке
- Для демо: автоматически загружает первое заведение из БД

### F7: Direct Connect (WhatsApp)

**Реализация:**
- Ссылка `wa.me/{phone}?text={encoded}` в VenueDetails
- Текст: «Привет! Пишу из LiveCity по поводу {venue.name}»

---

## 4. Пользовательские сценарии

### Flow 1: Поиск места (основной)
```
/ → Карта с 70 маркерами
  → Ввод запроса в SearchBar (или клик на chip)
  → AI возвращает 5 результатов с reasons
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

### Flow 3: Бизнес-аналитика
```
/dashboard → Skeleton loader
  → ScoreChart (30 дней)
  → ComplaintsList (AI-группировка)
  → ActionPlan (3 AI-рекомендации)
  → DistrictComparison (место в районе)
```

---

## 5. Нефункциональные требования

| Параметр | Требование | Статус |
|---|---|---|
| Время загрузки | < 3 сек (First Contentful Paint) | Done (static pre-render) |
| AI-ответ | < 5 сек | Done (Gemini 2.0 Flash) |
| Браузеры | Chrome, Safari (desktop + mobile) | Done |
| Мобильная адаптация | Responsive (bottom sheets, full-width panels) | Done |
| Данные | 70 заведений Алматы (seed) | Done |
| Язык интерфейса | Русский | Done |
| Тестирование | 37 unit тестов (Vitest) | Done |
| CI/CD | Lint + Typecheck + Tests + Build | Done |

---

## 6. Критерии приёмки (Definition of Done)

- [x] Карта загружается с маркерами заведений за < 3 секунд
- [x] Live Score отображается на каждом маркере с цветовой индикацией
- [x] AI-поиск обрабатывает запрос на русском языке и возвращает релевантные результаты
- [x] Тепловая карта переключается и отображает зоны активности
- [x] Карточка заведения показывает все поля (название, score, адрес, отзывы)
- [x] Кнопка WhatsApp открывает мессенджер с предзаполненным текстом
- [x] Бизнес-дашборд показывает график и AI-рекомендации
- [x] Mobile responsive: bottom sheet, full-width search
- [x] 37 тестов проходят
- [x] CI pipeline (lint + typecheck + test + build) проходит

# Отчёт: Фаза 3 — Frontend Core

**Дата:** 2026-02-18
**Статус:** Завершена

---

## Что сделано

### Epic 3.1: Layout + Navigation

| Файл | Назначение |
|---|---|
| `src/components/layout/Header.tsx` | Floating logo LiveCity поверх карты |

### Epic 3.2: Карта (Map View)

| Файл | Назначение |
|---|---|
| `src/components/map/MapView.tsx` | Полноэкранная Mapbox-карта (dark-v11), центр Алматы |
| `src/components/map/VenueMarker.tsx` | Кастомные маркеры с Live Score и цветом (зелёный/жёлтый/серый) |
| `src/components/map/HeatmapLayer.tsx` | GeoJSON heatmap-слой с градиентом (синий→зелёный→жёлтый→красный) |
| `src/components/map/MapControls.tsx` | Кнопки: toggle heatmap, geolocation, zoom +/- |

### Epic 3.3: Карточка заведения

| Файл | Назначение |
|---|---|
| `src/components/venue/VenueDetails.tsx` | Выезжающая панель справа: score, категория, адрес, теги, AI-описание, часы работы, отзывы, WhatsApp-кнопка |
| `src/components/venue/VenueCard.tsx` | Компактная карточка для списка результатов |
| `src/components/ui/LiveScoreBadge.tsx` | Цветной бейдж 0-10 (3 размера: sm/md/lg) |

### Epic 3.4: Поиск

| Файл | Назначение |
|---|---|
| `src/components/search/SearchBar.tsx` | Floating строка поиска с примерами-chips |
| `src/components/search/SearchResults.tsx` | Панель AI-результатов с интерпретацией и reason |

### Главная страница

| Файл | Назначение |
|---|---|
| `src/app/page.tsx` | Сборка всех компонентов: Map + Search + VenueDetails, dynamic import Mapbox (SSR disabled) |

---

## Архитектура UI

```
page.tsx (Home)
├── Header (floating logo)
├── SearchBar (floating, top)
├── SearchResults (floating, left panel)
├── MapView (fullscreen)
│   ├── VenueMarker[] (маркеры с score)
│   ├── HeatmapLayer (toggle)
│   └── MapControls (zoom, geo, heatmap toggle)
└── VenueDetails (right panel, slide-in)
    ├── LiveScoreBadge
    ├── Tags
    ├── Working Hours
    ├── Reviews
    └── WhatsApp button
```

## Проверки

| Проверка | Результат |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

## Зависимости добавлены

- `mapbox-gl` + `react-map-gl` — рендер карты
- `recharts` — графики для дашборда (Фаза 4)
- `@types/mapbox-gl` — типы

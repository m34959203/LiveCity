# LiveCity — Спецификация API

**Версия:** 1.0 (Demo — все endpoints реализованы)
**Обновлено:** 2026-02-18
**Base URL:** `/api`

---

## Обзор эндпоинтов

| Метод | Путь | Описание | Статус |
|---|---|---|---|
| GET | `/api/venues` | Список заведений (с фильтрами) | Done |
| GET | `/api/venues/:id` | Детали заведения | Done |
| POST | `/api/search` | AI-поиск на естественном языке | Done |
| GET | `/api/heatmap` | Данные для тепловой карты | Done |
| GET | `/api/categories` | Список категорий | Done |
| GET | `/api/dashboard/:venueId` | Аналитика для бизнеса | Done |

---

## 1. GET /api/venues

Список заведений с фильтрацией по bounds, категории, тегам, минимальному score.

### Query Parameters

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `bounds` | string | Нет | Bbox карты: `sw_lat,sw_lng,ne_lat,ne_lng` |
| `category` | string | Нет | Slug категории: `restaurant`, `cafe`, `park` |
| `tag` | string | Нет | Slug тега: `wifi`, `parking`, `kids-zone` |
| `minScore` | number | Нет | Минимальный Live Score (0-10) |
| `limit` | number | Нет | Лимит результатов (default: 50, max: 200) |
| `offset` | number | Нет | Смещение для пагинации (default: 0) |

### Response 200

```json
{
  "data": [
    {
      "id": "clx1abc123",
      "name": "Рестоbar",
      "slug": "restobar",
      "category": {
        "slug": "restaurant",
        "name": "Ресторан",
        "icon": "fork-knife",
        "color": "#E74C3C"
      },
      "address": "ул. Панфилова 22, Алматы",
      "latitude": 43.2567,
      "longitude": 76.9453,
      "liveScore": 8.7,
      "photoUrls": [],
      "tags": ["wifi", "terrace", "parking"],
      "isActive": true
    }
  ],
  "meta": {
    "total": 70,
    "limit": 50,
    "offset": 0
  }
}
```

**Реализация:** `VenueService.getAll(filters)` → Prisma findMany + count.

---

## 2. GET /api/venues/:id

Полная информация о заведении с тегами и отзывами.

### Response 200

```json
{
  "data": {
    "id": "clx1abc123",
    "name": "Рестоbar",
    "slug": "restobar",
    "description": "Уютный ресторан в центре Алматы...",
    "aiDescription": "Место с высокой активностью...",
    "category": {
      "slug": "restaurant",
      "name": "Ресторан",
      "icon": "fork-knife",
      "color": "#E74C3C"
    },
    "address": "ул. Панфилова 22, Алматы",
    "latitude": 43.2567,
    "longitude": 76.9453,
    "phone": "+7 727 123 4567",
    "whatsapp": "77271234567",
    "photoUrls": [],
    "workingHours": {
      "mon": "10:00-23:00",
      "tue": "10:00-23:00",
      "fri": "10:00-01:00",
      "sat": "11:00-01:00",
      "sun": "11:00-22:00"
    },
    "liveScore": 8.7,
    "tags": ["wifi", "terrace"],
    "tagDetails": [
      { "slug": "wifi", "name": "Wi-Fi" },
      { "slug": "terrace", "name": "Терраса" }
    ],
    "isActive": true,
    "recentReviews": [
      {
        "text": "Отличные стейки, быстро обслужили",
        "sentiment": 0.85,
        "source": "google",
        "createdAt": "2026-02-15T18:30:00.000Z"
      }
    ]
  }
}
```

**Реализация:** `VenueService.getById(id)` → Prisma findUnique + include tags, reviews (last 10).

---

## 3. POST /api/search

AI-поиск заведений на естественном языке через Gemini 2.0 Flash.

### Request Body

```json
{
  "query": "Тихое кафе с Wi-Fi для работы в центре",
  "location": {
    "latitude": 43.2380,
    "longitude": 76.9450
  },
  "limit": 5
}
```

### Response 200

```json
{
  "data": {
    "results": [
      {
        "venue": {
          "id": "clx2def456",
          "name": "Coffee Boom",
          "slug": "coffee-boom",
          "address": "ул. Абая 52",
          "latitude": 43.2401,
          "longitude": 76.9378,
          "liveScore": 7.2,
          "category": { "slug": "cafe", "name": "Кафе", "icon": "coffee", "color": "#F39C12" },
          "photoUrls": [],
          "tags": ["wifi", "business-lunch"]
        },
        "relevance": 0.94,
        "reason": "Тихая обстановка, скоростной Wi-Fi, отдельные столики для работы."
      }
    ],
    "interpretation": "Вы ищете спокойное место для работы с интернетом.",
    "totalFound": 5
  }
}
```

### Response 400

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Запрос слишком короткий"
  }
}
```

**Реализация:** Загрузка venues → `AIService.semanticSearch()` → Gemini → enrichment из БД. При ошибке Gemini → `fallbackSearch()` (текстовый поиск).

---

## 4. GET /api/heatmap

Данные для тепловой карты. Агрегация по grid buckets.

### Response 200

```json
{
  "data": {
    "points": [
      {
        "latitude": 43.256,
        "longitude": 76.945,
        "weight": 0.87,
        "venueCount": 12
      }
    ],
    "bounds": {
      "sw": { "latitude": 43.20, "longitude": 76.85 },
      "ne": { "latitude": 43.30, "longitude": 77.00 }
    }
  }
}
```

**Реализация:** `prisma.venue.findMany()` → группировка JS: `round(lat, 3)` + `round(lng, 3)` → avg score, count.

---

## 5. GET /api/categories

Список категорий с количеством заведений.

### Response 200

```json
{
  "data": [
    { "slug": "restaurant", "name": "Ресторан", "icon": "fork-knife", "color": "#E74C3C", "count": 20 },
    { "slug": "cafe", "name": "Кафе", "icon": "coffee", "color": "#F39C12", "count": 15 },
    { "slug": "bar", "name": "Бар", "icon": "beer", "color": "#9B59B6", "count": 10 },
    { "slug": "park", "name": "Парк", "icon": "tree", "color": "#27AE60", "count": 10 },
    { "slug": "mall", "name": "ТРЦ", "icon": "shopping-bag", "color": "#3498DB", "count": 8 },
    { "slug": "entertainment", "name": "Развлечения", "icon": "sparkles", "color": "#E91E63", "count": 7 }
  ]
}
```

**Реализация:** `prisma.category.findMany()` + `_count: { venues: true }`.

---

## 6. GET /api/dashboard/:venueId

Аналитика для бизнес-дашборда. Объединяет Score History, AI Complaints, AI Action Plan, District Comparison.

### Response 200

```json
{
  "data": {
    "venue": {
      "id": "clx1abc123",
      "name": "Рестоbar",
      "liveScore": 8.7
    },
    "scoreHistory": [
      { "date": "2026-01-19", "score": 7.8 },
      { "date": "2026-01-20", "score": 8.1 }
    ],
    "topComplaints": [
      {
        "topic": "Долгое ожидание счёта",
        "percentage": 34,
        "reviewCount": 12,
        "trend": "rising"
      }
    ],
    "actionPlan": [
      {
        "priority": 1,
        "action": "Внедрить QR-оплату для ускорения расчёта",
        "expectedImpact": "Снижение жалоб на ожидание на ~40%",
        "difficulty": "low"
      }
    ],
    "districtComparison": {
      "venueScore": 8.7,
      "districtAvg": 6.8,
      "cityAvg": 6.2,
      "rank": 3,
      "totalInDistrict": 45
    }
  }
}
```

**Реализация:** `AnalyticsService.getDashboardData(venueId)` → объединяет ScoreService + AIService (2 вызова Gemini).

---

## 7. Общие форматы

### Формат ошибок

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Заведение не найдено"
  }
}
```

### HTTP-коды

| Код | Значение |
|---|---|
| 200 | Успех |
| 400 | Ошибка валидации |
| 404 | Не найдено |
| 500 | Внутренняя ошибка |

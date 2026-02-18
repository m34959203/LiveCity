# LiveCity — Спецификация API

**Версия:** 0.1 (Demo)
**Дата:** 2026-02-18
**Base URL:** `/api`

---

## Обзор эндпоинтов

| Метод | Путь | Описание | Приоритет |
|---|---|---|---|
| GET | `/api/venues` | Список заведений (с фильтрами) | P0 |
| GET | `/api/venues/:id` | Детали заведения | P0 |
| POST | `/api/search` | AI-поиск на естественном языке | P0 |
| GET | `/api/heatmap` | Данные для тепловой карты | P1 |
| GET | `/api/categories` | Список категорий | P0 |
| GET | `/api/dashboard/:venueId` | Аналитика для бизнеса | P1 |

---

## 1. GET /api/venues

Получить список заведений с опциональной фильтрацией по гео-области и категории.

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
      "photoUrls": [
        "https://example.com/photo1.jpg"
      ],
      "tags": ["wifi", "terrace", "parking"],
      "isActive": true
    }
  ],
  "meta": {
    "total": 87,
    "limit": 50,
    "offset": 0
  }
}
```

---

## 2. GET /api/venues/:id

Получить полную информацию о заведении.

### Path Parameters

| Параметр | Тип | Описание |
|---|---|---|
| `id` | string | ID заведения |

### Response 200

```json
{
  "data": {
    "id": "clx1abc123",
    "name": "Рестоbar",
    "slug": "restobar",
    "description": "Уютный ресторан в центре Алматы...",
    "aiDescription": "Место с высокой активностью в соцсетях, особенно хвалят стейки и атмосферу террасы.",
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
    "photoUrls": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ],
    "workingHours": {
      "mon": "10:00-23:00",
      "tue": "10:00-23:00",
      "wed": "10:00-23:00",
      "thu": "10:00-23:00",
      "fri": "10:00-01:00",
      "sat": "11:00-01:00",
      "sun": "11:00-22:00"
    },
    "liveScore": 8.7,
    "tags": [
      { "slug": "wifi", "name": "Wi-Fi" },
      { "slug": "terrace", "name": "Терраса" },
      { "slug": "parking", "name": "Парковка" }
    ],
    "recentReviews": [
      {
        "text": "Отличные стейки, быстро обслужили",
        "sentiment": 0.85,
        "source": "google",
        "createdAt": "2026-02-15T18:30:00Z"
      }
    ]
  }
}
```

---

## 3. POST /api/search

AI-поиск заведений на естественном языке.

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
          "category": {
            "slug": "cafe",
            "name": "Кафе"
          },
          "photoUrls": ["https://example.com/cb1.jpg"],
          "tags": ["wifi", "business-lunch"]
        },
        "relevance": 0.94,
        "reason": "Тихая обстановка, скоростной Wi-Fi, отдельные столики для работы. Находится в 800м от вас."
      },
      {
        "venue": { "..." : "..." },
        "relevance": 0.87,
        "reason": "Известное место для фрилансеров, есть розетки у каждого столика."
      }
    ],
    "interpretation": "Вы ищете спокойное место для работы с интернетом в центральной части города.",
    "totalFound": 5
  }
}
```

### Response 400

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Запрос слишком короткий. Опишите, что вы ищете."
  }
}
```

---

## 4. GET /api/heatmap

Данные для тепловой карты активности.

### Query Parameters

| Параметр | Тип | Обязательный | Описание |
|---|---|---|---|
| `bounds` | string | Нет | Bbox карты: `sw_lat,sw_lng,ne_lat,ne_lng` |
| `resolution` | string | Нет | `low` (default), `medium`, `high` |

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
      },
      {
        "latitude": 43.241,
        "longitude": 76.938,
        "weight": 0.63,
        "venueCount": 8
      }
    ],
    "bounds": {
      "sw": { "latitude": 43.20, "longitude": 76.85 },
      "ne": { "latitude": 43.30, "longitude": 77.00 }
    }
  }
}
```

---

## 5. GET /api/categories

Список всех категорий заведений.

### Response 200

```json
{
  "data": [
    { "slug": "restaurant", "name": "Ресторан", "icon": "fork-knife", "color": "#E74C3C", "count": 32 },
    { "slug": "cafe", "name": "Кафе", "icon": "coffee", "color": "#F39C12", "count": 28 },
    { "slug": "bar", "name": "Бар", "icon": "beer", "color": "#9B59B6", "count": 15 },
    { "slug": "park", "name": "Парк", "icon": "tree", "color": "#27AE60", "count": 8 },
    { "slug": "mall", "name": "ТРЦ", "icon": "shopping-bag", "color": "#3498DB", "count": 5 },
    { "slug": "entertainment", "name": "Развлечения", "icon": "sparkles", "color": "#E91E63", "count": 12 }
  ]
}
```

---

## 6. GET /api/dashboard/:venueId

Аналитика для бизнес-дашборда.

### Path Parameters

| Параметр | Тип | Описание |
|---|---|---|
| `venueId` | string | ID заведения |

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
      { "date": "2026-01-20", "score": 8.1 },
      { "date": "2026-01-21", "score": 7.5 },
      "..."
    ],
    "topComplaints": [
      {
        "topic": "Долгое ожидание счёта",
        "percentage": 34,
        "reviewCount": 12,
        "trend": "rising"
      },
      {
        "topic": "Шум от соседних столиков",
        "percentage": 21,
        "reviewCount": 7,
        "trend": "stable"
      },
      {
        "topic": "Высокие цены на напитки",
        "percentage": 15,
        "reviewCount": 5,
        "trend": "declining"
      }
    ],
    "actionPlan": [
      {
        "priority": 1,
        "action": "Внедрить QR-оплату для ускорения расчёта",
        "expectedImpact": "Снижение жалоб на ожидание на ~40%",
        "difficulty": "low"
      },
      {
        "priority": 2,
        "action": "Установить акустические перегородки между зонами",
        "expectedImpact": "Улучшение оценки атмосферы на 0.3 балла",
        "difficulty": "medium"
      },
      {
        "priority": 3,
        "action": "Запустить happy hour на напитки (17:00-19:00)",
        "expectedImpact": "Увеличение посещаемости в «мёртвые» часы на ~20%",
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
| 400 | Ошибка валидации запроса |
| 404 | Ресурс не найден |
| 429 | Too Many Requests (rate limit) |
| 500 | Внутренняя ошибка сервера |

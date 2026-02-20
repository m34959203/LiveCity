# LiveCity — Спецификация API

**Версия:** 2.0
**Обновлено:** 2026-02-20
**Base URL:** `/api`

---

## Обзор эндпоинтов

### Public (11)

| Метод | Путь | Описание | Rate Limit |
|---|---|---|---|
| GET | `/api/venues` | Список заведений (с фильтрами) | 60/min |
| GET | `/api/venues/:id` | Детали заведения | 60/min |
| POST | `/api/venues/:id/sync` | Ручная синхронизация с 2GIS | 5/min |
| GET | `/api/venues/:id/pulse` | Социальный пульс заведения | 60/min |
| POST | `/api/search` | AI-поиск + Lazy Discovery | 30/min |
| GET | `/api/heatmap` | Данные для тепловой карты | 30/min |
| GET | `/api/categories` | Список категорий | 60/min |
| GET | `/api/dashboard/:venueId` | Бизнес-аналитика | 30/min |
| GET | `/api/dashboard/:venueId/competitors` | Конкурентная разведка | 10/min |
| GET | `/api/insights/:venueId` | Бесплатный AI-инсайт (The Hook) | 10/min |
| POST | `/api/planner` | AI Day Planner | 10/min |

### Cron (4, protected by CRON_SECRET)

| Метод | Путь | Описание | Частота |
|---|---|---|---|
| POST | `/api/cron/sync-pulse` | Главный pipeline: 2GIS → AI → Score | 6-12 часов |
| POST | `/api/cron/refresh-scores` | Пересчёт Live Score | 15 минут |
| POST | `/api/cron/venue-scout` | City Radar: обнаружение через OSM | Еженедельно |
| POST | `/api/cron/purge-seed` | Очистка seed-данных (отключён) | — |

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
        "icon": "utensils",
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

**Cache:** 30s max-age.
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
      "icon": "utensils",
      "color": "#E74C3C"
    },
    "address": "ул. Панфилова 22, Алматы",
    "latitude": 43.2567,
    "longitude": 76.9453,
    "phone": "+7 727 123 4567",
    "whatsapp": "77271234567",
    "email": "info@restobar.kz",
    "website": "https://restobar.kz",
    "instagramHandle": "restobar_almaty",
    "twoGisId": "70000001234567",
    "twoGisUrl": "https://2gis.kz/almaty/firm/70000001234567",
    "photoUrls": [],
    "features": ["Wi-Fi", "Парковка", "Средний чек 5000₸"],
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
        "source": "2gis",
        "rating": 5.0,
        "authorName": "Алексей К.",
        "createdAt": "2026-02-15T18:30:00.000Z"
      }
    ]
  }
}
```

**Реализация:** `VenueService.getById(id)` → Prisma findUnique + include tags, reviews (last 10).

---

## 3. POST /api/venues/:id/sync

Ручная синхронизация заведения с 2GIS. Обновляет данные, отзывы и пересчитывает Live Score.

### Response 200

```json
{
  "data": {
    "venue": { "id": "clx1abc123", "name": "Рестоbar", "liveScore": 8.9 },
    "synced": {
      "reviewsAdded": 12,
      "fieldsUpdated": ["phone", "workingHours", "photoUrls"],
      "newScore": 8.9,
      "previousScore": 8.7
    }
  }
}
```

**Rate Limit:** 5 req/min (тяжёлая операция).
**Реализация:** TwoGisService → AIAnalyzerService → ScoreService.

---

## 4. GET /api/venues/:id/pulse

Социальный пульс заведения — агрегация сигналов за последние 7 дней.

### Response 200

```json
{
  "data": {
    "totalMentions": 47,
    "avgSentiment": 0.72,
    "trend": "rising",
    "sources": [
      {
        "source": "2gis",
        "mentionCount": 35,
        "sentimentAvg": 0.68,
        "lastCollected": "2026-02-20T12:00:00.000Z"
      },
      {
        "source": "instagram",
        "mentionCount": 12,
        "sentimentAvg": 0.82,
        "lastCollected": "2026-02-20T06:00:00.000Z"
      }
    ]
  }
}
```

**Реализация:** `SocialSignalService.getSocialPulse(venueId)`.

---

## 5. POST /api/search

AI-поиск заведений на естественном языке. 3-ступенчатый: AI → keyword fallback → Lazy Discovery (OSM).

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
    "totalFound": 5,
    "source": "ai"
  }
}
```

**source** может быть: `"ai"`, `"keyword"` (fallback), `"osm"` (Lazy Discovery).

При Lazy Discovery: venues автоматически создаются в БД из OpenStreetMap.

### Response 400

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Запрос слишком короткий"
  }
}
```

---

## 6. GET /api/heatmap

Данные для тепловой карты. Агрегация по grid buckets.

### Query Parameters

| Параметр | Тип | Описание |
|---|---|---|
| `resolution` | string | `"low"` (default), `"medium"`, `"high"` |

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
    ]
  }
}
```

**Реализация:** Prisma findMany → группировка JS: `round(lat, precision)` → avg score, count.

---

## 7. GET /api/categories

Список категорий с количеством заведений.

### Response 200

```json
{
  "data": [
    { "slug": "restaurant", "name": "Ресторан", "icon": "utensils", "color": "#E74C3C", "count": 20 },
    { "slug": "cafe", "name": "Кафе", "icon": "coffee", "color": "#F39C12", "count": 15 },
    { "slug": "bar", "name": "Бар", "icon": "beer", "color": "#9B59B6", "count": 10 },
    { "slug": "park", "name": "Парк", "icon": "tree", "color": "#27AE60", "count": 10 },
    { "slug": "mall", "name": "ТРЦ", "icon": "shopping-bag", "color": "#3498DB", "count": 8 },
    { "slug": "entertainment", "name": "Развлечения", "icon": "sparkles", "color": "#E91E63", "count": 7 }
  ]
}
```

**Cache:** 300s max-age.

---

## 8. GET /api/dashboard/:venueId

Аналитика для бизнес-дашборда. Объединяет Score History, Social Pulse, AI Complaints, AI Action Plan, District Comparison, AI Analysis.

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
    "socialPulse": {
      "totalMentions": 47,
      "avgSentiment": 0.72,
      "trend": "rising",
      "weeklyMentions": 15,
      "sources": [
        { "source": "2gis", "mentionCount": 35, "sentimentAvg": 0.68 },
        { "source": "instagram", "mentionCount": 12, "sentimentAvg": 0.82 }
      ]
    },
    "aiAnalysis": {
      "strongPoints": ["Быстрое обслуживание", "Качественные стейки"],
      "weakPoints": ["Шумно по вечерам", "Дорогое меню"],
      "sentimentTrend": "improving"
    },
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

**Реализация:** `AnalyticsService.getDashboardData(venueId)`.

---

## 9. GET /api/dashboard/:venueId/competitors

Конкурентная разведка — SWOT-анализ по ближайшим конкурентам.

### Response 200

```json
{
  "data": {
    "venue": { "id": "clx1abc123", "name": "Рестоbar" },
    "competitors": [
      {
        "id": "clx3ghi789",
        "name": "Steak House",
        "liveScore": 7.9,
        "distance": 0.8,
        "positiveReviews": ["Отличная атмосфера", "Большие порции"]
      }
    ],
    "insights": {
      "strengths": ["Более высокий Live Score", "Лучшие отзывы о качестве еды"],
      "weaknesses": ["Конкуренты хвалят атмосферу больше"],
      "opportunities": ["Добавить летнюю террасу для привлечения клиентов"],
      "summary": "Рестоbar лидирует по качеству, но уступает в атмосфере."
    }
  }
}
```

**Реализация:** `CompetitorService.getCompetitorInsights(venueId)` — поиск в радиусе 2 км, та же категория.

---

## 10. GET /api/insights/:venueId

"The Hook" — бесплатный AI-инсайт для привлечения бизнес-клиентов. Публичный эндпоинт, без авторизации.

### Response 200

```json
{
  "data": {
    "venue": { "id": "clx1abc123", "name": "Рестоbar", "liveScore": 8.7 },
    "hook": "Вы теряете до 15% гостей из-за медленного обслуживания",
    "problems": [
      "Долгое ожидание счёта (34% жалоб)",
      "Шум в зале по вечерам (21% жалоб)",
      "Неудобная парковка (12% жалоб)"
    ],
    "quickWins": [
      "Внедрите QR-оплату — снизите жалобы на ожидание на 40%",
      "Добавьте звукопоглощающие панели в основном зале",
      "Разместите навигацию к парковке на входе"
    ],
    "estimatedRevenueLoss": "~120,000₸/мес",
    "socialPulse": {
      "totalMentions": 47,
      "avgSentiment": 0.72,
      "trend": "rising"
    }
  }
}
```

**Rate Limit:** 10 req/min.

---

## 11. POST /api/planner

AI Day Planner — построение оптимизированного маршрута дня.

### Request Body

```json
{
  "query": "Хочу провести день с семьёй — дети 5 и 8 лет, бюджет средний",
  "preferences": {
    "groupType": "family",
    "budget": "medium"
  }
}
```

### Response 200

```json
{
  "data": {
    "interpretation": "Семейный день с детьми 5 и 8 лет, средний бюджет",
    "steps": [
      {
        "order": 1,
        "time": "10:00",
        "venue": {
          "id": "clx4jkl012",
          "name": "Парк Горького",
          "liveScore": 8.2,
          "address": "ул. Гоголя 1"
        },
        "duration": "2 часа",
        "reason": "Детские площадки и прогулочные зоны — идеально для утренней прогулки",
        "tips": "Возьмите самокаты — есть ровные дорожки"
      }
    ],
    "totalDuration": "8 часов",
    "estimatedBudget": "~8,000₸ на семью"
  }
}
```

---

## 12-15. Cron Endpoints

### POST /api/cron/sync-pulse

Главный data pipeline. Защищён заголовком `Authorization: Bearer {CRON_SECRET}`.

**3 режима:** Apify (Mode A) / 2GIS парсер (Mode B, default) / OSM-only (Mode C).

### POST /api/cron/refresh-scores

Пересчёт Live Score для всех активных заведений.

### POST /api/cron/venue-scout

City Radar — обнаружение новых заведений через OpenStreetMap Overpass для 5 городов КЗ.

### POST /api/cron/purge-seed

Очистка seed-данных. **Отключён** для защиты OSM-discovered venues.

---

## 16. Общие форматы

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
| 401 | Не авторизован (cron) |
| 404 | Не найдено |
| 429 | Rate limit exceeded |
| 500 | Внутренняя ошибка |

### Rate Limiting

Rate limiting реализован через `rate-limit.ts` middleware. При превышении лимита возвращается 429:

```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests. Try again later."
  }
}
```

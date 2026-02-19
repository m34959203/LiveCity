# LiveCity — Схема базы данных

**Версия:** 1.0 (Demo — реализована)
**Обновлено:** 2026-02-18
**СУБД:** PostgreSQL
**ORM:** Prisma 6

---

## 1. ER-диаграмма

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Category   │────<│      Venue       │>────│   VenueTag      │
│              │     │                  │     │                 │
│ id           │     │ id               │     │ venue_id        │
│ name         │     │ name             │     │ tag_id          │
│ slug         │     │ slug             │     └────────┬────────┘
│ icon         │     │ category_id (FK) │              │
│ color        │     │ description      │     ┌────────▼────────┐
└──────────────┘     │ ai_description   │     │      Tag        │
                     │ address          │     │                 │
                     │ latitude         │     │ id              │
                     │ longitude        │     │ name            │
                     │ phone            │     │ slug            │
                     │ whatsapp         │     └─────────────────┘
                     │ working_hours    │
                     │ photo_urls[]     │
                     │ live_score       │
                     │ is_active        │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼─────┐ ┌──────▼───────┐ ┌─────▼──────────┐
    │  ScoreHistory  │ │   Review     │ │ SocialSignal   │
    │               │ │              │ │                │
    │ id            │ │ id           │ │ id             │
    │ venue_id (FK) │ │ venue_id(FK) │ │ venue_id (FK)  │
    │ score         │ │ text         │ │ source         │
    │ calculated_at │ │ sentiment    │ │ mention_count  │
    └───────────────┘ │ source       │ │ sentiment_avg  │
                      │ rating       │ │ collected_at   │
                      │ author_name  │ └────────────────┘
                      │ created_at   │
                      └──────────────┘
```

**7 моделей:** Venue, Category, Tag, VenueTag, ScoreHistory, Review, SocialSignal

---

## 2. Prisma Schema (актуальная)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Venue {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  description   String?  @db.Text
  aiDescription String?  @db.Text @map("ai_description")
  address       String
  latitude      Float
  longitude     Float
  phone         String?
  whatsapp      String?
  photoUrls     String[] @map("photo_urls")
  workingHours  Json?    @map("working_hours")
  liveScore     Float    @default(0) @map("live_score")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  categoryId String   @map("category_id")
  category   Category @relation(fields: [categoryId], references: [id])

  tags          VenueTag[]
  scoreHistory  ScoreHistory[]
  reviews       Review[]
  socialSignals SocialSignal[]

  @@index([latitude, longitude])
  @@index([liveScore])
  @@index([categoryId])
  @@map("venues")
}

model Category {
  id    String @id @default(cuid())
  name  String @unique
  slug  String @unique
  icon  String
  color String

  venues Venue[]

  @@map("categories")
}

model Tag {
  id   String @id @default(cuid())
  name String @unique
  slug String @unique

  venues VenueTag[]

  @@map("tags")
}

model VenueTag {
  venueId String @map("venue_id")
  tagId   String @map("tag_id")

  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)
  tag   Tag   @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([venueId, tagId])
  @@map("venue_tags")
}

model ScoreHistory {
  id           String   @id @default(cuid())
  score        Float
  calculatedAt DateTime @default(now()) @map("calculated_at")

  venueId String @map("venue_id")
  venue   Venue  @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId, calculatedAt])
  @@map("score_history")
}

model Review {
  id         String   @id @default(cuid())
  text       String   @db.Text
  sentiment  Float    // -1.0 (негатив) ... +1.0 (позитив)
  source     String   // "google", "2gis", "instagram", "manual"
  rating     Float?
  authorName String?  @map("author_name")
  createdAt  DateTime @default(now()) @map("created_at")

  venueId String @map("venue_id")
  venue   Venue  @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId, createdAt])
  @@index([sentiment])
  @@map("reviews")
}

model SocialSignal {
  id           String   @id @default(cuid())
  source       String   // "instagram", "tiktok", "google_maps"
  mentionCount Int      @map("mention_count")
  sentimentAvg Float    @map("sentiment_avg")
  collectedAt  DateTime @default(now()) @map("collected_at")

  venueId String @map("venue_id")
  venue   Venue  @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId, collectedAt])
  @@map("social_signals")
}
```

---

## 3. Seed-данные (реализовано)

### 3.1. Категории (6 штук)

| Slug | Название | Иконка | Цвет | Кол-во заведений |
|---|---|---|---|---|
| restaurant | Ресторан | utensils | #E74C3C | 20 |
| cafe | Кафе | coffee | #F39C12 | 15 |
| bar | Бар | beer | #9B59B6 | 10 |
| park | Парк | tree | #27AE60 | 10 |
| mall | ТРЦ | shopping-bag | #3498DB | 8 |
| entertainment | Развлечения | sparkles | #E91E63 | 7 |

**Итого:** 70 заведений в Алматы

### 3.2. Теги (12 штук)

| Slug | Название |
|---|---|
| wifi | Wi-Fi |
| parking | Парковка |
| kids-zone | Детская зона |
| terrace | Терраса |
| live-music | Живая музыка |
| pet-friendly | С животными |
| halal | Халяль |
| business-lunch | Бизнес-ланч |
| 24h | Круглосуточно |
| delivery | Доставка |
| hookah | Кальян |
| vip | VIP-зал |

### 3.3. Автогенерация при seed

- **Reviews:** 5-15 рандомных отзывов на заведение (из шаблонов), sentiment от -0.8 до +0.9
- **Score History:** 30 дней данных для каждого заведения
- **Social Signals:** 1-3 источника на заведение (instagram, tiktok, google_maps)
- **Working Hours:** JSON с расписанием пн-вс

---

## 4. Индексы

| Таблица | Индекс | Назначение |
|---|---|---|
| venues | `(latitude, longitude)` | Геопоиск по bounds |
| venues | `(live_score)` | Сортировка по рейтингу |
| venues | `(category_id)` | Фильтрация по категории |
| score_history | `(venue_id, calculated_at)` | История score по дате |
| reviews | `(venue_id, created_at)` | Последние отзывы |
| reviews | `(sentiment)` | Фильтрация негативных |
| social_signals | `(venue_id, collected_at)` | Последние сигналы |

---

## 5. Ключевые запросы (Prisma)

### Геопоиск (заведения в bounds)

```typescript
prisma.venue.findMany({
  where: {
    isActive: true,
    latitude: { gte: swLat, lte: neLat },
    longitude: { gte: swLng, lte: neLng },
  },
  include: { category: true, tags: { include: { tag: true } } },
  orderBy: { liveScore: "desc" },
  take: 100,
});
```

### Heatmap (агрегация по grid buckets)

```typescript
prisma.venue.findMany({
  where: { isActive: true },
  select: { latitude: true, longitude: true, liveScore: true },
});
// Затем группировка в JS: round(lat, 3) + round(lng, 3) → avg(score)
```

### District average

```typescript
prisma.venue.aggregate({
  where: {
    isActive: true,
    latitude: { gte: lat - delta, lte: lat + delta },
    longitude: { gte: lng - delta, lte: lng + delta },
  },
  _avg: { liveScore: true },
  _count: true,
});
```

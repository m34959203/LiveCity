# LiveCity — Схема базы данных

**Версия:** 0.1 (Demo)
**Дата:** 2026-02-18
**СУБД:** PostgreSQL 15 + PostGIS

---

## 1. ER-диаграмма (упрощённая)

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Category   │────<│      Venue       │>────│   VenueTag      │
│              │     │                  │     │                 │
│ id           │     │ id               │     │ venue_id        │
│ name         │     │ name             │     │ tag_id          │
│ icon         │     │ category_id (FK) │     └────────┬────────┘
│ color        │     │ description      │              │
└──────────────┘     │ address          │     ┌────────▼────────┐
                     │ location (POINT) │     │      Tag        │
                     │ phone            │     │                 │
                     │ whatsapp         │     │ id              │
                     │ working_hours    │     │ name            │
                     │ photo_urls[]     │     │ slug            │
                     │ live_score       │     └─────────────────┘
                     │ created_at       │
                     │ updated_at       │
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
                      │ created_at   │ │ collected_at   │
                      └──────────────┘ └────────────────┘
```

---

## 2. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

// ============================================
// VENUE (Заведение)
// ============================================

model Venue {
  id            String    @id @default(cuid())
  name          String
  slug          String    @unique
  description   String?   @db.Text
  aiDescription String?   @db.Text  @map("ai_description")
  address       String
  latitude      Float
  longitude     Float
  phone         String?
  whatsapp      String?
  photoUrls     String[]  @map("photo_urls")
  workingHours  Json?     @map("working_hours")
  liveScore     Float     @default(0) @map("live_score")
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  categoryId    String    @map("category_id")
  category      Category  @relation(fields: [categoryId], references: [id])
  tags          VenueTag[]
  scoreHistory  ScoreHistory[]
  reviews       Review[]
  socialSignals SocialSignal[]

  @@index([latitude, longitude])
  @@index([liveScore])
  @@index([categoryId])
  @@map("venues")
}

// ============================================
// CATEGORY (Категория заведения)
// ============================================

model Category {
  id    String  @id @default(cuid())
  name  String  @unique
  slug  String  @unique
  icon  String  // emoji или icon name
  color String  // hex цвет для маркера

  venues Venue[]

  @@map("categories")
}

// ============================================
// TAG (Теги/Фичи: Wi-Fi, парковка, терраса)
// ============================================

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

// ============================================
// SCORE HISTORY (История Live Score)
// ============================================

model ScoreHistory {
  id           String   @id @default(cuid())
  score        Float
  calculatedAt DateTime @default(now()) @map("calculated_at")

  venueId String @map("venue_id")
  venue   Venue  @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId, calculatedAt])
  @@map("score_history")
}

// ============================================
// REVIEW (Отзывы — агрегированные из разных источников)
// ============================================

model Review {
  id        String   @id @default(cuid())
  text      String   @db.Text
  sentiment Float    // -1.0 (негатив) ... +1.0 (позитив)
  source    String   // "google", "2gis", "instagram", "manual"
  rating    Float?   // оригинальный рейтинг источника (1-5)
  authorName String? @map("author_name")
  createdAt DateTime @default(now()) @map("created_at")

  venueId String @map("venue_id")
  venue   Venue  @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId, createdAt])
  @@index([sentiment])
  @@map("reviews")
}

// ============================================
// SOCIAL SIGNAL (Сигналы из соцсетей)
// ============================================

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

## 3. Seed-данные для демо

### 3.1. Категории

| Slug | Название | Иконка | Цвет |
|---|---|---|---|
| restaurant | Ресторан | fork-knife | #E74C3C |
| cafe | Кафе | coffee | #F39C12 |
| bar | Бар | beer | #9B59B6 |
| park | Парк | tree | #27AE60 |
| mall | ТРЦ | shopping-bag | #3498DB |
| entertainment | Развлечения | sparkles | #E91E63 |

### 3.2. Теги

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

### 3.3. Демо-заведения (примеры)

Seed должен содержать **50-100 заведений** Алматы. Примеры:

| Название | Категория | Район | Live Score |
|---|---|---|---|
| Рестоbar | restaurant | Алмалинский | 8.7 |
| Coffee Boom | cafe | Медеуский | 7.2 |
| Парк 28 Панфиловцев | park | Медеуский | 9.1 |
| Mega Park | mall | Бостандыкский | 6.5 |
| Del Papa | restaurant | Бостандыкский | 8.3 |
| Кофейня Чашка | cafe | Ауэзовский | 5.4 |

---

## 4. Ключевые запросы

### Геопространственный поиск (заведения в радиусе)

```sql
SELECT *,
  ST_Distance(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint($lng, $lat)::geography
  ) AS distance_meters
FROM venues
WHERE ST_DWithin(
  ST_MakePoint(longitude, latitude)::geography,
  ST_MakePoint($lng, $lat)::geography,
  $radius_meters
)
ORDER BY live_score DESC
LIMIT 50;
```

### Heatmap-данные (агрегация по районам)

```sql
SELECT
  ROUND(latitude::numeric, 3) as lat_bucket,
  ROUND(longitude::numeric, 3) as lng_bucket,
  AVG(live_score) as avg_score,
  COUNT(*) as venue_count
FROM venues
WHERE is_active = true
GROUP BY lat_bucket, lng_bucket;
```

### История Score для дашборда

```sql
SELECT
  DATE(calculated_at) as date,
  AVG(score) as avg_score
FROM score_history
WHERE venue_id = $venueId
  AND calculated_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(calculated_at)
ORDER BY date;
```

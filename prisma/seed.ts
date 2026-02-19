import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// CATEGORIES — 6 типов заведений
// ============================================
const categories = [
  { name: "Ресторан", slug: "restaurant", icon: "utensils", color: "#E74C3C" },
  { name: "Кафе", slug: "cafe", icon: "coffee", color: "#F39C12" },
  { name: "Бар", slug: "bar", icon: "beer", color: "#9B59B6" },
  { name: "Парк", slug: "park", icon: "tree", color: "#27AE60" },
  { name: "ТРЦ", slug: "mall", icon: "shopping-bag", color: "#3498DB" },
  {
    name: "Развлечения",
    slug: "entertainment",
    icon: "sparkles",
    color: "#E91E63",
  },
];

// ============================================
// TAGS — 12 тегов/аменитей
// ============================================
const tags = [
  { name: "Wi-Fi", slug: "wifi" },
  { name: "Парковка", slug: "parking" },
  { name: "Детская зона", slug: "kids-zone" },
  { name: "Терраса", slug: "terrace" },
  { name: "Живая музыка", slug: "live-music" },
  { name: "С животными", slug: "pet-friendly" },
  { name: "Халяль", slug: "halal" },
  { name: "Бизнес-ланч", slug: "business-lunch" },
  { name: "Круглосуточно", slug: "24h" },
  { name: "Доставка", slug: "delivery" },
  { name: "Кальян", slug: "hookah" },
  { name: "VIP-зал", slug: "vip" },
];

// ============================================
// MAIN SEED — только каркас, без фейковых данных
// ============================================
// Заведения приходят из РЕАЛЬНЫХ источников:
//   - City Radar (venue-scout CRON) — Google Places + 2GIS
//   - Lazy Discovery — поиск пользователей
// Отзывы/скоры собирает sync-pulse автоматически.
// ============================================

async function main() {
  console.log("Seeding LiveCity database (structure only)...\n");

  // --- Upsert Categories ---
  console.log("Creating categories...");
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, color: cat.color },
      create: cat,
    });
  }
  console.log(`  ${categories.length} categories ready`);

  // --- Upsert Tags ---
  console.log("Creating tags...");
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    });
  }
  console.log(`  ${tags.length} tags ready`);

  console.log("\n=== SEED COMPLETE ===");
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Tags: ${tags.length}`);
  console.log(`  Venues: 0 (will be populated by venue-scout & lazy discovery)`);
  console.log("\nNext steps:");
  console.log("  1. Run venue-scout: POST /api/cron/venue-scout");
  console.log("  2. Or search for a place — Lazy Discovery creates it on the fly");
  console.log("  3. sync-pulse will collect reviews & calculate scores automatically");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { execSync } from "child_process";

function run(cmd, label) {
  console.log(`[startup] ${label}...`);
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`[startup] ${label} — done`);
    return true;
  } catch {
    console.error(`[startup] ${label} — failed`);
    return false;
  }
}

// 1. Create/sync tables
run("npx prisma db push --skip-generate", "Syncing database schema");

// 2. Seed categories & tags if not present (first deploy)
try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const categoryCount = await prisma.category.count();
  const venueCount = await prisma.venue.count();
  await prisma.$disconnect();

  if (categoryCount === 0) {
    console.log("[startup] No categories found — running seed (categories + tags)...");
    run("npx tsx prisma/seed.ts", "Seeding categories & tags");
  } else {
    console.log(`[startup] ${categoryCount} categories, ${venueCount} venues — seed OK`);
  }

  if (venueCount === 0) {
    console.log("[startup] No venues yet — they will appear via:");
    console.log("  - venue-scout CRON (City Radar)");
    console.log("  - Lazy Discovery (user searches)");
  }
} catch {
  console.log("[startup] Could not check DB — skipping seed");
}

// 3. Start Next.js
run("npx next start", "Starting Next.js");

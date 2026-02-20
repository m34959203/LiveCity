import { execSync, exec } from "child_process";

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

// 2. Seed categories & tags + purge old fake venues
try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const categoryCount = await prisma.category.count();
  const venueCount = await prisma.venue.count();

  if (categoryCount === 0) {
    await prisma.$disconnect();
    console.log("[startup] No categories found — running seed (categories + tags)...");
    run("npx tsx prisma/seed.ts", "Seeding categories & tags");
  } else {
    console.log(`[startup] ${categoryCount} categories, ${venueCount} venues`);

    // Note: purge logic removed — OSM-discovered venues don't have
    // googlePlaceId or twoGisUrl, so the old purge would delete real data.
    console.log(`[startup] ${venueCount} venues in DB`);

    const realVenues = await prisma.venue.count();
    if (realVenues === 0) {
      console.log("[startup] No venues yet — they will appear via:");
      console.log("  - venue-scout CRON (City Radar)");
      console.log("  - Lazy Discovery (user searches)");
    }

    await prisma.$disconnect();
  }
} catch (e) {
  console.log("[startup] Could not check DB — skipping seed/purge:", e?.message);
}

// 4. Start Next.js, then auto-trigger venue-scout after boot
const port = process.env.PORT || 3000;
const cronSecret = process.env.CRON_SECRET || "";

console.log("[startup] Starting Next.js...");
const server = exec(`npx next start -p ${port}`, { stdio: "inherit" });

server.stdout?.pipe(process.stdout);
server.stderr?.pipe(process.stderr);

// Wait for server to be ready, then trigger venue-scout once
if (cronSecret) {
  setTimeout(async () => {
    try {
      console.log("[startup] Auto-triggering venue-scout (City Radar)...");
      const res = await fetch(`http://localhost:${port}/api/cron/venue-scout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const data = await res.json();
      if (data.data) {
        console.log(
          `[startup] venue-scout: ${data.data.totalDiscovered} discovered, ${data.data.totalNew} new venues`,
        );
      } else {
        console.log("[startup] venue-scout response:", JSON.stringify(data));
      }
    } catch (e) {
      console.log("[startup] venue-scout trigger failed:", e?.message);
    }
  }, 15000); // 15s delay for Next.js to fully boot
}

server.on("exit", (code) => process.exit(code ?? 1));

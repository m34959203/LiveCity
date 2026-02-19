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

// 2. Seed if database is empty (first deploy)
try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const count = await prisma.venue.count();
  await prisma.$disconnect();

  if (count === 0) {
    console.log("[startup] Database is empty — running seed...");
    run("npx tsx prisma/seed.ts", "Seeding database");
  } else {
    console.log(`[startup] Database has ${count} venues — skipping seed`);
  }
} catch {
  console.log("[startup] Could not check venue count — skipping seed");
}

// 3. Start Next.js
run("npx next start", "Starting Next.js");

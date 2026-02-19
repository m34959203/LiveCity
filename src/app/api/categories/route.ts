import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  const { allowed } = rateLimit(ip, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { venues: true } },
      },
      orderBy: { name: "asc" },
    });

    const data = categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      color: c.color,
      count: c._count.venues,
    }));

    const response = NextResponse.json({ data });
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );
    return response;
  } catch (error) {
    logger.error("GET /api/categories failed", {
      endpoint: "/api/categories",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

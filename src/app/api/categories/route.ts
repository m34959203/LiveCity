import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

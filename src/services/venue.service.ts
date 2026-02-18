import { prisma } from "@/lib/prisma";
import type { VenueFilters } from "@/types/venue";

export class VenueService {
  static async getAll(filters: VenueFilters) {
    const { bounds, category, tag, minScore, limit = 50, offset = 0 } = filters;

    const where: Record<string, unknown> = { isActive: true };

    if (bounds) {
      where.latitude = { gte: bounds.swLat, lte: bounds.neLat };
      where.longitude = { gte: bounds.swLng, lte: bounds.neLng };
    }

    if (category) {
      where.category = { slug: category };
    }

    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }

    if (minScore !== undefined) {
      where.liveScore = { gte: minScore };
    }

    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
        orderBy: { liveScore: "desc" },
        take: Math.min(limit, 200),
        skip: offset,
      }),
      prisma.venue.count({ where }),
    ]);

    return {
      data: venues.map((v) => ({
        id: v.id,
        name: v.name,
        slug: v.slug,
        category: {
          slug: v.category.slug,
          name: v.category.name,
          icon: v.category.icon,
          color: v.category.color,
        },
        address: v.address,
        latitude: v.latitude,
        longitude: v.longitude,
        liveScore: v.liveScore,
        photoUrls: v.photoUrls,
        tags: v.tags.map((vt) => vt.tag.slug),
        isActive: v.isActive,
      })),
      meta: { total, limit, offset },
    };
  }

  static async getById(id: string) {
    const v = await prisma.venue.findUnique({
      where: { id },
      include: {
        category: true,
        tags: { include: { tag: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!v) return null;

    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      description: v.description,
      aiDescription: v.aiDescription,
      category: {
        slug: v.category.slug,
        name: v.category.name,
        icon: v.category.icon,
        color: v.category.color,
      },
      address: v.address,
      latitude: v.latitude,
      longitude: v.longitude,
      phone: v.phone,
      whatsapp: v.whatsapp,
      photoUrls: v.photoUrls,
      workingHours: v.workingHours as Record<string, string> | null,
      liveScore: v.liveScore,
      tags: v.tags.map((vt) => vt.tag.slug),
      tagDetails: v.tags.map((vt) => ({
        slug: vt.tag.slug,
        name: vt.tag.name,
      })),
      isActive: v.isActive,
      recentReviews: v.reviews.map((r) => ({
        text: r.text,
        sentiment: r.sentiment,
        source: r.source,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  static async getByBounds(
    swLat: number,
    swLng: number,
    neLat: number,
    neLng: number,
    limit = 100,
  ) {
    return this.getAll({
      bounds: { swLat, swLng, neLat, neLng },
      limit,
    });
  }
}

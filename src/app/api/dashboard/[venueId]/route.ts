import { NextResponse } from "next/server";
import { AnalyticsService } from "@/services/analytics.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  try {
    const { venueId } = await params;
    const data = await AnalyticsService.getDashboardData(venueId);

    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Заведение не найдено" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/dashboard/:venueId error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

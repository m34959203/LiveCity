import { NextResponse } from "next/server";
import { VenueService } from "@/services/venue.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const venue = await VenueService.getById(id);

    if (!venue) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Заведение не найдено" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: venue });
  } catch (error) {
    console.error("GET /api/venues/:id error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: venue, error } = await supabase
    .from("venues")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  // Fetch recent reviews for this venue
  const { data: reviews } = await supabase
    .from("reviews_analyzed")
    .select("*")
    .eq("venue_id", id)
    .order("published_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ venue, reviews: reviews ?? [] });
}

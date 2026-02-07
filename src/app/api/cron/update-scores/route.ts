import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateFreshnessWeight } from "@/lib/live-score";

/**
 * Cron endpoint: Updates freshness weights and recalculates Live Scores.
 * Should be called periodically (e.g., every hour via Vercel Cron).
 *
 * This handles the "Decay" mechanic: venues that haven't been mentioned
 * recently will see their scores drift toward neutral.
 */
export async function POST(request: Request) {
  // Simple API key auth for cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // 1. Update freshness weights on all reviews
  const { data: reviews } = await supabase
    .from("reviews_analyzed")
    .select("id, published_at");

  if (reviews) {
    for (const review of reviews) {
      const newWeight = calculateFreshnessWeight(review.published_at);
      await supabase
        .from("reviews_analyzed")
        .update({ freshness_weight: newWeight })
        .eq("id", review.id);
    }
  }

  // 2. Recalculate live_score for all venues
  const { data: venues } = await supabase.from("venues").select("id");

  if (venues) {
    for (const venue of venues) {
      await supabase.rpc("recalculate_live_score", {
        target_venue_id: venue.id,
      });
    }
  }

  return NextResponse.json({
    updated_reviews: reviews?.length ?? 0,
    updated_venues: venues?.length ?? 0,
  });
}

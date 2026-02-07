import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const reviewAnalysisSchema = z.object({
  sentiment: z
    .number()
    .min(-1)
    .max(1)
    .describe("Sentiment score from -1 (very negative) to 1 (very positive)"),
  tags: z
    .array(z.string())
    .describe(
      "Relevant tags like food_quality, service_speed, ambiance, cleanliness, price_value"
    ),
  summary: z
    .string()
    .describe("Brief one-sentence summary of the review in Russian"),
});

export async function POST(request: Request) {
  const { venue_id, reviews } = await request.json();

  if (!venue_id || !Array.isArray(reviews) || reviews.length === 0) {
    return NextResponse.json(
      { error: "venue_id and reviews[] are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const results = [];

  for (const review of reviews) {
    try {
      const { object: analysis } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: reviewAnalysisSchema,
        prompt: `Analyze this review about a venue. Determine sentiment, extract relevant tags, and write a brief summary in Russian.

Review text: "${review.text}"
Source: ${review.source ?? "unknown"}`,
      });

      const { data, error } = await supabase
        .from("reviews_analyzed")
        .insert({
          venue_id,
          source: review.source ?? "manual",
          source_url: review.source_url ?? null,
          source_author: review.author ?? null,
          original_text: review.text,
          sentiment: analysis.sentiment,
          tags: analysis.tags,
          ai_summary: analysis.summary,
          published_at: review.published_at ?? new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        results.push({ text: review.text, error: error.message });
      } else {
        results.push({ text: review.text, analysis: data });
      }
    } catch (err) {
      results.push({
        text: review.text,
        error: err instanceof Error ? err.message : "Analysis failed",
      });
    }
  }

  // Recalculate the venue's live score
  await supabase.rpc("recalculate_live_score", {
    target_venue_id: venue_id,
  });

  return NextResponse.json({ results });
}

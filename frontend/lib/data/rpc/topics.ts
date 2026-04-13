"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createTopicWithPrediction(input: {
  spaceId?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  visibility?: "public" | "authenticated" | "moderators_only";
  closeAt?: string;
  predictionType?:
    | "binary"
    | "date_value"
    | "categorical_closed"
    | "bounded_percentage"
    | "bounded_volume"
    | "bounded_integer"
    | "ordinal_scale";
  predictionTitle?: string | null;
  scoringMethod?:
    | "exact_match"
    | "normalized_absolute_error"
    | "normalized_relative_error"
    | "ordinal_distance"
    | "date_distance";
  aggregationMethod?:
    | "binary_split"
    | "median_distribution"
    | "option_distribution"
    | "numeric_summary"
    | "ordinal_summary";
}) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("rpc_create_topic_with_prediction", {
    p_space_id: input.spaceId ?? null,
    p_slug: input.slug,
    p_title: input.title,
    p_description: input.description ?? null,
    p_visibility: input.visibility ?? "public",
    p_close_at: input.closeAt ?? null,
    p_prediction_type: input.predictionType ?? "binary",
    p_prediction_title: input.predictionTitle ?? input.title,
    p_scoring_method: input.scoringMethod ?? "exact_match",
    p_aggregation_method: input.aggregationMethod ?? "binary_split"
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

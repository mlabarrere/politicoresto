"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function placeBetAction(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "").trim();
  const threadPostId = String(formData.get("thread_post_id") ?? "").trim() || null;
  const predictionType = String(formData.get("prediction_type") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!threadId || !predictionType) {
    throw new Error("Bet invalid");
  }

  const payload: Record<string, string | number | boolean | null> = {
    p_thread_id: threadId,
    p_thread_post_id: threadPostId,
    p_answer_boolean: null,
    p_answer_date: null,
    p_answer_numeric: null,
    p_answer_option_id: null,
    p_answer_ordinal: null,
    p_source_context: "frontend:thread-detail"
  };

  if (predictionType === "binary") {
    payload.p_answer_boolean = String(formData.get("answer_boolean") ?? "") === "true";
  } else if (predictionType === "categorical_closed") {
    payload.p_answer_option_id = String(formData.get("answer_option_id") ?? "").trim() || null;
  } else if (predictionType === "date_value") {
    payload.p_answer_date = String(formData.get("answer_date") ?? "").trim() || null;
  } else if (predictionType === "ordinal_scale") {
    const ordinal = String(formData.get("answer_ordinal") ?? "").trim();
    payload.p_answer_ordinal = ordinal ? Number(ordinal) : null;
  } else {
    const numeric = String(formData.get("answer_numeric") ?? "").trim();
    payload.p_answer_numeric = numeric ? Number(numeric) : null;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("place_bet", payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

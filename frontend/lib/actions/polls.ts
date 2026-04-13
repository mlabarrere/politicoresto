"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function votePollAction(formData: FormData) {
  const pollId = String(formData.get("poll_id") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!pollId) {
    throw new Error("Poll required");
  }

  const answers: Array<Record<string, string | number>> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("question:")) {
      continue;
    }

    const pollQuestionId = key.replace("question:", "");
    const rawValue = String(value).trim();

    if (!rawValue) {
      continue;
    }

    const payload: Record<string, string | number> = { poll_question_id: pollQuestionId };

    if (rawValue.startsWith("option:")) {
      payload.selected_option_id = rawValue.replace("option:", "");
    } else {
      payload.ordinal_value = Number(rawValue);
    }

    answers.push(payload);
  }

  if (!answers.length) {
    throw new Error("Answer required");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("vote_poll", {
    p_poll_id: pollId,
    p_answers: answers
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

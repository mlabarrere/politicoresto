"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function submitPrediction(input: {
  topicId: string;
  answerBoolean?: boolean | null;
  answerDate?: string | null;
  answerNumeric?: number | null;
  answerOptionId?: string | null;
  answerOrdinal?: number | null;
  sourceContext?: string | null;
}) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("rpc_submit_prediction", {
    p_topic_id: input.topicId,
    p_answer_boolean: input.answerBoolean ?? null,
    p_answer_date: input.answerDate ?? null,
    p_answer_numeric: input.answerNumeric ?? null,
    p_answer_option_id: input.answerOptionId ?? null,
    p_answer_ordinal: input.answerOrdinal ?? null,
    p_source_context: input.sourceContext ?? null
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

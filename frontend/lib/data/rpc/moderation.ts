"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function reportContent(input: {
  targetType: "post" | "topic" | "poll" | "profile" | "prediction_submission";
  targetId: string;
  reasonCode: string;
  reasonDetail?: string | null;
}) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("rpc_report_content", {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason_code: input.reasonCode,
    p_reason_detail: input.reasonDetail ?? null
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

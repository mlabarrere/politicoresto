"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createPoll(input: {
  spaceId?: string | null;
  topicId?: string | null;
  title: string;
  description?: string | null;
  visibility?: "public" | "authenticated" | "moderators_only";
  closeAt?: string | null;
}) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("rpc_create_poll", {
    p_space_id: input.spaceId ?? null,
    p_topic_id: input.topicId ?? null,
    p_title: input.title,
    p_description: input.description ?? null,
    p_visibility: input.visibility ?? "public",
    p_close_at: input.closeAt ?? null
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createPost(input: {
  topicId?: string | null;
  spaceId?: string | null;
  postType?:
    | "news"
    | "analysis"
    | "discussion"
    | "local"
    | "moderation"
    | "resolution_justification";
  title?: string | null;
  bodyMarkdown: string;
}) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("rpc_create_post", {
    p_topic_id: input.topicId ?? null,
    p_space_id: input.spaceId ?? null,
    p_post_type: input.postType ?? "discussion",
    p_title: input.title ?? null,
    p_body_markdown: input.bodyMarkdown
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

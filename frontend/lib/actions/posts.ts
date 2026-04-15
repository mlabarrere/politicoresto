"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchUrlPreview, normalizeSourceUrl } from "@/lib/utils/url-preview";

export async function createPostAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sourceUrl = normalizeSourceUrl(String(formData.get("source_url") ?? "").trim());
  const mode = String(formData.get("post_mode") ?? "post").trim() === "poll" ? "poll" : "post";
  const pollQuestion = String(formData.get("poll_question") ?? "").trim();
  const pollDeadlineHoursRaw = Number(formData.get("poll_deadline_hours") ?? 24);
  const pollDeadlineHours = Number.isFinite(pollDeadlineHoursRaw)
    ? Math.max(1, Math.min(48, Math.floor(pollDeadlineHoursRaw)))
    : 24;
  const pollOptions = formData
    .getAll("poll_options")
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0);
  const description = body ? body.slice(0, 280) : null;
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!title) {
    throw new Error("Title required");
  }

  if (mode === "poll") {
    if (!pollQuestion) {
      throw new Error("Poll question required");
    }
    if (pollOptions.length < 2) {
      throw new Error("At least two poll options required");
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data: postData, error } = await supabase.rpc("create_post_topic", {
    p_title: title,
    p_description: description,
    p_entity_id: null,
    p_space_id: null,
    p_close_at: null
  });

  if (error) {
    throw new Error(error.message);
  }

  const postId = Array.isArray(postData)
    ? (postData[0] as { id?: string } | null)?.id ?? null
    : ((postData as { id?: string } | null)?.id ?? null);

  if (postId) {
    const preview = sourceUrl ? await fetchUrlPreview(sourceUrl) : null;

    const { data: postItemData, error: opError } = await supabase.rpc("create_post_item", {
      p_post_id: postId,
      p_type: "article",
      p_title: title,
      p_content: body || null,
      p_metadata: {
        is_original_post: true,
        source_url: sourceUrl,
        link_preview: preview,
        post_mode: mode
      }
    });

    if (opError) {
      throw new Error(opError.message);
    }

    const postItemId = Array.isArray(postItemData)
      ? (postItemData[0] as { id?: string } | null)?.id ?? null
      : ((postItemData as { id?: string } | null)?.id ?? null);

    if (mode === "poll" && postItemId) {
      const deadlineAt = new Date(Date.now() + pollDeadlineHours * 60 * 60 * 1000).toISOString();

      const { error: pollError } = await supabase.rpc("create_post_poll", {
        p_post_item_id: postItemId,
        p_question: pollQuestion,
        p_deadline_at: deadlineAt,
        p_options: pollOptions
      });

      if (pollError) {
        throw new Error(pollError.message);
      }

      const { error: metadataError } = await supabase.rpc("rpc_update_thread_post", {
        p_thread_post_id: postItemId,
        p_title: title,
        p_content: body || null,
        p_metadata: {
          is_original_post: true,
          source_url: sourceUrl,
          link_preview: preview,
          post_mode: "poll",
          poll: {
            question: pollQuestion,
            deadline_at: deadlineAt,
            option_count: pollOptions.length
          }
        }
      });

      if (metadataError) {
        throw new Error(metadataError.message);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/category/[slug]");
  if (redirectPath !== "/") {
    revalidatePath(redirectPath);
  }
  redirect(redirectPath as Route);
}



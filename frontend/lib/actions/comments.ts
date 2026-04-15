"use server";

import { revalidatePath } from "next/cache";

import { parseNonEmptyString } from "@/lib/domain/comments/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createCommentAction(formData: FormData) {
  const threadPostId = parseNonEmptyString(formData.get("thread_post_id"));
  const parentPostId = parseNonEmptyString(formData.get("parent_post_id"));
  const body = parseNonEmptyString(formData.get("body"));
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (threadPostId === null || body === null) {
    throw new Error("Comment invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_comment", {
    p_thread_post_id: threadPostId,
    p_parent_post_id: parentPostId ?? null,
    p_body_markdown: body
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

export async function updateCommentAction(formData: FormData) {
  const commentId = parseNonEmptyString(formData.get("comment_id"));
  const body = parseNonEmptyString(formData.get("body"));
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (commentId === null || body === null) {
    throw new Error("Comment invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_update_comment", {
    p_comment_id: commentId,
    p_body_markdown: body
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

export async function deleteCommentAction(formData: FormData) {
  const commentId = parseNonEmptyString(formData.get("comment_id"));
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (commentId === null) {
    throw new Error("Comment invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_delete_comment", {
    p_comment_id: commentId
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}



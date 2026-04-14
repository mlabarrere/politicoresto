"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createCommentAction(formData: FormData) {
  const threadPostId = String(formData.get("thread_post_id") ?? "").trim();
  const parentPostId = String(formData.get("parent_post_id") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!threadPostId || !body) {
    throw new Error("Comment invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_comment", {
    p_thread_post_id: threadPostId,
    p_parent_post_id: parentPostId,
    p_body_markdown: body
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

export async function updateCommentAction(formData: FormData) {
  const commentId = String(formData.get("comment_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!commentId || !body) {
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
  const commentId = String(formData.get("comment_id") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!commentId) {
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

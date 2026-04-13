"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createThreadAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const entityId = String(formData.get("entity_id") ?? "").trim() || null;
  const spaceId = String(formData.get("space_id") ?? "").trim() || null;
  const closeAt = String(formData.get("close_at") ?? "").trim() || null;
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!title) {
    throw new Error("Title required");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_thread", {
    p_title: title,
    p_description: description,
    p_entity_id: entityId,
    p_space_id: spaceId,
    p_close_at: closeAt
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/topics");
  if (redirectPath !== "/") {
    revalidatePath(redirectPath);
  }
}

export async function createThreadPostAction(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "").trim();
  const type = String(formData.get("type") ?? "article").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "").trim() || null;
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!threadId) {
    throw new Error("Thread required");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_post", {
    p_thread_id: threadId,
    p_type: type,
    p_title: title,
    p_content: content,
    p_metadata: {}
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/topics");
  revalidatePath(redirectPath);
}

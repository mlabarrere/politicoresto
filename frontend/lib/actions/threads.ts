"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchUrlPreview, normalizeSourceUrl } from "@/lib/utils/url-preview";

export async function createThreadAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sourceUrl = normalizeSourceUrl(String(formData.get("source_url") ?? "").trim());
  const description = body ? body.slice(0, 280) : null;
  const entityId = String(formData.get("entity_id") ?? "").trim() || null;
  const spaceId = String(formData.get("space_id") ?? "").trim() || null;
  const closeAt = String(formData.get("close_at") ?? "").trim() || null;
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!title) {
    throw new Error("Title required");
  }

  const supabase = await createServerSupabaseClient();
  const { data: threadData, error } = await supabase.rpc("create_thread", {
    p_title: title,
    p_description: description,
    p_entity_id: entityId,
    p_space_id: spaceId,
    p_close_at: closeAt
  });

  if (error) {
    throw new Error(error.message);
  }

  const threadId = Array.isArray(threadData)
    ? (threadData[0] as { id?: string } | null)?.id ?? null
    : ((threadData as { id?: string } | null)?.id ?? null);

  if (threadId) {
    const preview = sourceUrl ? await fetchUrlPreview(sourceUrl) : null;

    const { error: opError } = await supabase.rpc("create_post", {
      p_thread_id: threadId,
      p_type: "article",
      p_title: title,
      p_content: body || null,
      p_metadata: {
        is_original_post: true,
        source_url: sourceUrl,
        link_preview: preview
      }
    });

    if (opError) {
      throw new Error(opError.message);
    }
  }

  revalidatePath("/");
  revalidatePath("/category/[slug]");
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
  revalidatePath(redirectPath);
}

export async function updateThreadPostAction(formData: FormData) {
  const threadPostId = String(formData.get("thread_post_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "").trim() || null;
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!threadPostId) {
    throw new Error("Thread post required");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_update_thread_post", {
    p_thread_post_id: threadPostId,
    p_title: title,
    p_content: content
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

export async function deleteThreadPostAction(formData: FormData) {
  const threadPostId = String(formData.get("thread_post_id") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!threadPostId) {
    throw new Error("Thread post required");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_delete_thread_post", {
    p_thread_post_id: threadPostId
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

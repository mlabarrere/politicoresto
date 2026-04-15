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
  const description = body ? body.slice(0, 280) : null;
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!title) {
    throw new Error("Title required");
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

    const { error: opError } = await supabase.rpc("create_post_item", {
      p_post_id: postId,
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
  redirect(redirectPath as Route);
}



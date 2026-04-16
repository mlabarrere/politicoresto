"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchUrlPreview, normalizeSourceUrl } from "@/lib/utils/url-preview";

const VALIDATION_ERRORS = new Set([
  "Title required",
  "Poll question required",
  "At least two poll options required"
]);

type BackendError = {
  message?: string;
  code?: string;
};

function isMissingRpc(error: BackendError | null | undefined) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "").toLowerCase();
  return (
    message.includes("schema cache") ||
    message.includes("could not find the function") ||
    message.includes("undefined function") ||
    code === "42883" ||
    code === "pgrst202"
  );
}

function extractTopicId(result: unknown) {
  if (typeof result === "string") return result;
  return Array.isArray(result)
    ? (result[0] as { id?: string } | null)?.id ?? null
    : ((result as { id?: string } | null)?.id ?? null);
}

async function rollbackThreadCreation(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  threadId: string | null
) {
  if (!threadId || typeof (supabase as { from?: unknown }).from !== "function") return;

  const { error } = await supabase.from("topic").delete().eq("id", threadId);
  if (error) {
    console.warn("[createPostAction] rollback failed", {
      threadId,
      message: error.message
    });
  }
}

async function createPostItemWithFallback({
  supabase,
  threadId,
  title,
  body,
  metadata
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  threadId: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}): Promise<{ postItemId: string | null; method: "create_post_item" | "create_post" }> {
  const createPostItemInput = {
    p_post_id: threadId,
    p_type: "article",
    p_title: title,
    p_content: body || null,
    p_metadata: metadata
  };

  const createPostItemResult = await supabase.rpc("create_post_item", createPostItemInput);
  if (!createPostItemResult.error) {
    return {
      postItemId: extractTopicId(createPostItemResult.data),
      method: "create_post_item"
    };
  }

  if (!isMissingRpc(createPostItemResult.error)) {
    throw new Error(createPostItemResult.error.message);
  }

  const createPostResult = await supabase.rpc("create_post", {
    p_thread_id: threadId,
    p_type: "article",
    p_title: title,
    p_content: body || null,
    p_metadata: metadata
  });

  if (createPostResult.error) {
    throw new Error(createPostResult.error.message);
  }

  return {
    postItemId: extractTopicId(createPostResult.data),
    method: "create_post"
  };
}

export async function createPostAction(formData: FormData) {
  const fallbackErrorPath = "/post/new";
  try {
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
    const createThreadInput = {
      p_title: title,
      p_description: description,
      p_entity_id: null,
      p_space_id: null,
      p_close_at: null
    };

    const createThreadResult = await supabase.rpc("create_thread", createThreadInput);
    let threadId = extractTopicId(createThreadResult.data);
    let createMethod: "create_post_topic" | "create_thread" = "create_thread";
    let createItemMethod: "create_post_item" | "create_post" | "none" = "none";

    if (createThreadResult.error && isMissingRpc(createThreadResult.error)) {
      const createTopicResult = await supabase.rpc("create_post_topic", createThreadInput);
      if (createTopicResult.error) {
        throw new Error(createTopicResult.error.message);
      }
      threadId = extractTopicId(createTopicResult.data);
      createMethod = "create_post_topic";
    } else if (createThreadResult.error) {
      throw new Error(createThreadResult.error.message);
    }

    if (!threadId) {
      throw new Error("Creation du thread impossible.");
    }

    const preview = sourceUrl ? await fetchUrlPreview(sourceUrl) : null;

    const postMetadata = {
      is_original_post: true,
      source_url: sourceUrl,
      link_preview: preview,
      post_mode: mode
    };

    let postItemId: string | null = null;
    try {
      const createdPost = await createPostItemWithFallback({
        supabase,
        threadId,
        title,
        body,
        metadata: postMetadata
      });
      postItemId = createdPost.postItemId;
      createItemMethod = createdPost.method;
    } catch (error) {
      await rollbackThreadCreation(supabase, threadId);
      throw error;
    }

    if (!postItemId) {
      await rollbackThreadCreation(supabase, threadId);
      throw new Error("Creation du post initial impossible.");
    }

    if (mode === "poll") {
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

    revalidatePath("/");
    revalidatePath("/category/[slug]");
    if (redirectPath !== "/") {
      revalidatePath(redirectPath);
    }
    console.info("[createPostAction] post created", {
      mode,
      redirectPath,
      createMethod,
      threadId,
      createItemMethod,
      postItemId
    });
    redirect(redirectPath as never);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Creation du post impossible.";
    if (VALIDATION_ERRORS.has(message)) {
      throw error;
    }
    console.error("[createPostAction] failed", {
      message,
      error,
      context: { path: "/post/new" }
    });
    redirect(`${fallbackErrorPath}?error=${encodeURIComponent(message)}`);
  }
}

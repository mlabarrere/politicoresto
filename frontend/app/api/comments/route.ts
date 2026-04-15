import { NextResponse } from "next/server";

import { buildForumCommentTree } from "@/lib/forum/mappers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CommentView } from "@/lib/types/views";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function checkRateLimit() {
  return true;
}

async function getThreadPostIdBySlug(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, threadSlug: string) {
  const { data: thread, error: threadError } = await supabase
    .from("v_thread_detail")
    .select("id")
    .eq("slug", threadSlug)
    .maybeSingle();

  if (threadError || !thread) {
    throw new Error("thread not found");
  }

  const { data: post, error: postError } = await supabase
    .from("v_thread_posts")
    .select("id")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (postError || !post) {
    throw new Error("thread post not found");
  }

  return String(post.id);
}

async function fetchCommentView(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  commentId: string,
  userId: string
): Promise<CommentView> {
  const { data: comment, error } = await supabase
    .from("v_post_comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();

  if (error || !comment) {
    throw new Error("comment not found");
  }

  const { data: reaction } = await supabase
    .from("reaction")
    .select("reaction_type")
    .eq("target_type", "comment")
    .eq("target_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  const userReactionSide =
    reaction?.reaction_type === "upvote"
      ? "gauche"
      : reaction?.reaction_type === "downvote"
        ? "droite"
        : null;

  return {
    ...(comment as CommentView),
    user_reaction_side: userReactionSide
  };
}

export async function POST(request: Request) {
  if (!checkRateLimit()) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    threadSlug?: string;
    body?: string;
    parentCommentId?: string | null;
  } | null;

  if (!body || !isNonEmptyString(body.threadSlug) || !isNonEmptyString(body.body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const threadPostId = await getThreadPostIdBySlug(supabase, body.threadSlug);
    const { data: inserted, error } = await supabase.rpc("create_comment", {
      p_thread_post_id: threadPostId,
      p_parent_post_id: body.parentCommentId ?? null,
      p_body_markdown: body.body.trim()
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const insertedId = String((inserted as { id?: string } | null)?.id ?? "");
    if (!insertedId) {
      return NextResponse.json({ error: "Create failed" }, { status: 500 });
    }

    const comment = await fetchCommentView(supabase, insertedId, user.id);
    const node = buildForumCommentTree([comment], "oldest")[0];

    return NextResponse.json({ comment: node });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!checkRateLimit()) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { commentId?: string; body?: string } | null;

  if (!body || !isNonEmptyString(body.commentId) || !isNonEmptyString(body.body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await supabase.rpc("rpc_update_comment", {
    p_comment_id: body.commentId,
    p_body_markdown: body.body.trim()
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!checkRateLimit()) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { commentId?: string } | null;

  if (!body || !isNonEmptyString(body.commentId)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await supabase.rpc("rpc_delete_comment", {
    p_comment_id: body.commentId
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

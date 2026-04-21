import { NextResponse } from 'next/server';
import { parseNonEmptyString } from '@/lib/domain/comments/validation';
import { mapCommentViewToForumNode } from '@/lib/forum/mappers';
import {
  canCreateCommentToday,
  RATE_LIMIT_MESSAGES,
} from '@/lib/security/rate-limit';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CommentView } from '@/lib/types/views';

const COMMENT_MUTATION_ERROR = 'Comment operation failed';

async function getPostIdBySlug(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  postSlug: string,
) {
  const { data: postRoot, error: postRootError } = await supabase
    .from('v_thread_detail')
    .select('id')
    .eq('slug', postSlug)
    .maybeSingle();

  if (postRootError || !postRoot) {
    throw new Error('post not found');
  }

  const { data: post, error: postError } = await supabase
    .from('v_thread_posts')
    .select('id')
    .eq('thread_id', postRoot.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (postError || !post) {
    throw new Error('post item not found');
  }

  return String(post.id);
}

async function fetchCommentView(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  commentId: string,
  userId: string,
): Promise<CommentView> {
  const { data: comment, error } = await supabase
    .from('v_post_comments')
    .select('*')
    .eq('id', commentId)
    .maybeSingle();

  if (error || !comment) {
    throw new Error('comment not found');
  }

  const { data: reaction } = await supabase
    .from('reaction')
    .select('reaction_type')
    .eq('target_type', 'comment')
    .eq('target_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();

  const userReactionSide =
    reaction?.reaction_type === 'upvote'
      ? 'gauche'
      : reaction?.reaction_type === 'downvote'
        ? 'droite'
        : null;

  return {
    ...(comment as CommentView),
    post_id: String(
      (comment as { post_id?: string | null }).post_id ??
        (comment as { thread_id?: string | null }).thread_id ??
        '',
    ),
    post_item_id:
      (comment as { post_item_id?: string | null }).post_item_id ??
      (comment as { thread_post_id?: string | null }).thread_post_id ??
      null,
    user_reaction_side: userReactionSide,
  };
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const rateLimit = await canCreateCommentToday(supabase, userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGES.comment },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    postSlug?: string;
    body?: string;
    parentCommentId?: string | null;
  } | null;

  const postSlug = parseNonEmptyString(body?.postSlug);
  const commentBody = parseNonEmptyString(body?.body);

  if (!body || postSlug === null || commentBody === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const postId = await getPostIdBySlug(supabase, postSlug);
    const { data: inserted, error } = await supabase.rpc('create_comment', {
      p_thread_post_id: postId,
      p_parent_post_id: body.parentCommentId ?? null,
      p_body_markdown: commentBody,
    });

    if (error) {
      console.error('[comments][POST] rpc error', {
        message: error.message,
        code: error.code,
      });
      return NextResponse.json(
        { error: COMMENT_MUTATION_ERROR },
        { status: 400 },
      );
    }

    const insertedId = String((inserted as { id?: string } | null)?.id ?? '');
    if (!insertedId) {
      return NextResponse.json({ error: 'Create failed' }, { status: 500 });
    }

    const comment = await fetchCommentView(supabase, insertedId, userId);
    const node = mapCommentViewToForumNode(comment);

    return NextResponse.json({ comment: node });
  } catch (error) {
    console.error('[comments][POST] failed', { error });
    return NextResponse.json(
      { error: COMMENT_MUTATION_ERROR },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    commentId?: string;
    body?: string;
  } | null;
  const commentId = parseNonEmptyString(body?.commentId);
  const commentBody = parseNonEmptyString(body?.body);

  if (!body || commentId === null || commentBody === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabase.rpc('rpc_update_comment', {
    p_comment_id: commentId,
    p_body_markdown: commentBody,
  });

  if (error) {
    console.error('[comments][PATCH] rpc error', {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: COMMENT_MUTATION_ERROR },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    commentId?: string;
  } | null;
  const commentId = parseNonEmptyString(body?.commentId);

  if (!body || commentId === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabase.rpc('rpc_delete_comment', {
    p_comment_id: commentId,
  });

  if (error) {
    console.error('[comments][DELETE] rpc error', {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: COMMENT_MUTATION_ERROR },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

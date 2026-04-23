'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createLogger, logError } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchUrlPreview, normalizeSourceUrl } from '@/lib/utils/url-preview';

const log = createLogger('posts');

const TITLE_MAX = 200;
const BODY_MAX = 10_000;

const VALIDATION_ERRORS = new Set([
  'Title required',
  'Poll question required',
  'At least two poll options required',
  'Poll deadline must be set within 48h',
  'Daily post limit reached',
]);

const GENERIC_ERROR_CODE = 'publish_failed';

function safePath(raw: string) {
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export async function createPostAction(formData: FormData) {
  let successRedirectPath = '/';

  try {
    const title = String(formData.get('title') ?? '').trim();
    const body = String(formData.get('body') ?? '').trim() || null;
    const sourceUrl = normalizeSourceUrl(
      String(formData.get('source_url') ?? '').trim(),
    );
    const mode =
      String(formData.get('post_mode') ?? 'post').trim() === 'poll'
        ? 'poll'
        : 'post';
    const pollQuestion =
      String(formData.get('poll_question') ?? '').trim() || null;
    const pollDeadlineHoursRaw = Number(
      formData.get('poll_deadline_hours') ?? 24,
    );
    const pollDeadlineHours = Number.isFinite(pollDeadlineHoursRaw)
      ? Math.max(1, Math.min(48, Math.floor(pollDeadlineHoursRaw)))
      : 24;
    const pollOptions = formData
      .getAll('poll_options')
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);
    const subjectIds = formData
      .getAll('subject_ids')
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0);
    const partyTags = formData
      .getAll('party_tags')
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0)
      .slice(0, 3);
    const redirectPath = safePath(
      String(formData.get('redirect_path') ?? '/').trim() || '/',
    );

    // Validation côté client minimale — la RPC refait tout et raise un message
    // lisible avec un errcode propre. Le rôle de l'action = parser puis appeler.
    if (!title) throw new Error('Title required');
    if (mode === 'poll') {
      if (!pollQuestion) throw new Error('Poll question required');
      if (pollOptions.length < 2)
        throw new Error('At least two poll options required');
    }

    const pollDeadlineAt =
      mode === 'poll'
        ? new Date(
            Date.now() + pollDeadlineHours * 60 * 60 * 1000,
          ).toISOString()
        : null;
    const linkPreview = sourceUrl ? await fetchUrlPreview(sourceUrl) : null;

    const supabase = await createServerSupabaseClient();

    // UN SEUL appel réseau : topic + thread_post + subjects + poll + options
    // en une transaction côté DB. Rate limit inclus dans la RPC.
    const t0 = performance.now();
    const { data, error } = await supabase
      .rpc('rpc_create_post_full', {
        p_title: title,
        p_body: body,
        p_source_url: sourceUrl,
        p_link_preview: linkPreview,
        p_mode: mode,
        p_poll_question: pollQuestion,
        p_poll_deadline_at: pollDeadlineAt,
        p_poll_options: pollOptions,
        p_subject_ids: subjectIds,
        p_party_tags: partyTags,
      })
      .single();
    const rpcMs = Math.round(performance.now() - t0);

    if (error) {
      const message = error.message ?? '';
      // Les erreurs de validation DB remontent en clair pour l'UI
      if (VALIDATION_ERRORS.has(message)) {
        throw new Error(message);
      }
      log.error(
        {
          event: 'posts.create.rpc_failed',
          message,
          code: error.code,
          rpc_ms: rpcMs,
        },
        'create post rpc failed',
      );
      throw new Error('Publication impossible.');
    }

    const threadId = (data as { thread_id?: string } | null)?.thread_id ?? null;
    const postItemId =
      (data as { post_item_id?: string } | null)?.post_item_id ?? null;
    if (!threadId || !postItemId) {
      throw new Error('Publication impossible.');
    }

    log.info(
      {
        event: 'posts.create.ok',
        mode,
        thread_id: threadId,
        post_item_id: postItemId,
        redirect_path: redirectPath,
        rpc_ms: rpcMs,
      },
      'post created',
    );

    revalidatePath('/');
    if (redirectPath !== '/') revalidatePath(redirectPath);

    // Post-create nudge: if the user hasn't completed their demographic
    // profile AND hasn't dismissed the nudge before, append ?nudge=1 so
    // the home page renders the one-time completion modal.
    try {
      const { data: completion } = await supabase
        .rpc('rpc_get_profile_completion')
        .maybeSingle();
      const c = completion as {
        has_date_of_birth?: boolean;
        has_postal_code?: boolean;
        has_seen_completion_nudge?: boolean;
      } | null;
      const incomplete = !c?.has_date_of_birth || !c?.has_postal_code;
      if (c && incomplete && !c.has_seen_completion_nudge) {
        const sep = redirectPath.includes('?') ? '&' : '?';
        successRedirectPath = `${redirectPath}${sep}nudge=1`;
      } else {
        successRedirectPath = redirectPath;
      }
    } catch {
      successRedirectPath = redirectPath;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Publication impossible.';
    if (VALIDATION_ERRORS.has(message)) {
      throw error;
    }

    logError(log, error, { event: 'posts.create.failed', message });
    redirect(
      `/post/new?error=${encodeURIComponent(GENERIC_ERROR_CODE)}` as never,
    );
  }

  // Redirect lives outside the try/catch so its internal NEXT_REDIRECT
  // throw isn't swallowed and mis-routed to the error page — that bug
  // used to mask successful posts as failures. Default '/' keeps this
  // call-site type-safe without a null assertion.
  redirect(successRedirectPath as never);
}

export async function updatePostAction(formData: FormData) {
  const postItemId = String(formData.get('post_item_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();

  if (!postItemId) throw new Error('Post id required');
  if (!title) throw new Error('Title required');
  if (title.length > TITLE_MAX)
    throw new Error(`Title too long (max ${TITLE_MAX})`);
  if (body.length > BODY_MAX)
    throw new Error(`Body too long (max ${BODY_MAX})`);

  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    log.warn({ event: 'posts.update.unauthenticated' }, 'no user');
    throw new Error('Authentication required');
  }

  const { error } = await supabase.rpc('rpc_update_thread_post', {
    p_thread_post_id: postItemId,
    p_title: title,
    p_content: body || null,
  });

  if (error) {
    const message = error.message ?? '';
    if (/not owned/i.test(message)) {
      log.warn(
        {
          event: 'posts.update.forbidden',
          user_id: userId,
          post_item_id: postItemId,
        },
        'non-author attempted update',
      );
      throw new Error('Seul l\u2019auteur peut modifier ce post.');
    }
    if (/not found/i.test(message)) {
      throw new Error('Post introuvable.');
    }
    logError(log, error, {
      event: 'posts.update.rpc_failed',
      user_id: userId,
      post_item_id: postItemId,
      message,
    });
    throw new Error('Modification impossible.');
  }

  log.info(
    { event: 'posts.update.ok', user_id: userId, post_item_id: postItemId },
    'post updated',
  );

  revalidatePath('/');
  if (slug) revalidatePath(`/post/${slug}`);

  redirect((slug ? `/post/${slug}` : '/') as never);
}

export async function updatePollAction(formData: FormData) {
  const postItemId = String(formData.get('post_item_id') ?? '').trim();
  const question = String(formData.get('poll_question') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const optionLabels = formData
    .getAll('poll_options')
    .map((v) => String(v ?? '').trim());

  if (!postItemId) throw new Error('Post id required');
  if (!question) throw new Error('Poll question required');
  if (optionLabels.some((l) => l.length === 0))
    throw new Error('Les options ne peuvent pas être vides.');

  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    log.warn({ event: 'polls.update.unauthenticated' }, 'no user');
    throw new Error('Authentication required');
  }

  const { error } = await supabase.rpc('rpc_update_post_poll', {
    p_post_item_id: postItemId,
    p_question: question,
    p_option_labels: optionLabels,
  });

  if (error) {
    const message = error.message ?? '';
    if (/not owned/i.test(message)) {
      throw new Error('Seul l\u2019auteur peut modifier ce sondage.');
    }
    if (/locked/i.test(message)) {
      throw new Error('Sondage verrouillé : un vote a déjà été enregistré.');
    }
    if (/not found/i.test(message)) {
      throw new Error('Sondage introuvable.');
    }
    logError(log, error, {
      event: 'polls.update.rpc_failed',
      user_id: userId,
      post_item_id: postItemId,
      message,
    });
    throw new Error('Modification impossible.');
  }

  log.info(
    { event: 'polls.update.ok', user_id: userId, post_item_id: postItemId },
    'poll updated',
  );

  revalidatePath('/');
  if (slug) revalidatePath(`/post/${slug}`);

  redirect((slug ? `/post/${slug}` : '/') as never);
}

export async function deletePostAction(formData: FormData) {
  const postItemId = String(formData.get('post_item_id') ?? '').trim();
  if (!postItemId) throw new Error('Post id required');

  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    log.warn({ event: 'posts.delete.unauthenticated' }, 'no user');
    throw new Error('Authentication required');
  }

  const { error } = await supabase.rpc('rpc_delete_thread_post', {
    p_thread_post_id: postItemId,
  });

  if (error) {
    const message = error.message ?? '';
    if (/not owned/i.test(message)) {
      log.warn(
        {
          event: 'posts.delete.forbidden',
          user_id: userId,
          post_item_id: postItemId,
        },
        'non-author attempted delete',
      );
      throw new Error('Seul l\u2019auteur peut supprimer ce post.');
    }
    if (/not found/i.test(message)) {
      throw new Error('Post introuvable.');
    }
    logError(log, error, {
      event: 'posts.delete.rpc_failed',
      user_id: userId,
      post_item_id: postItemId,
      message,
    });
    throw new Error('Suppression impossible.');
  }

  log.info(
    { event: 'posts.delete.ok', user_id: userId, post_item_id: postItemId },
    'post deleted',
  );

  revalidatePath('/');

  redirect('/' as never);
}

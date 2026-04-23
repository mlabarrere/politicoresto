import { adminClient, SEED_USER } from '../../fixtures/supabase-admin';

/**
 * Wipes every post authored by the seed user.
 *
 * Why this exists: several E2E specs (post-creation, post-edit-delete,
 * poll-creation, ui-responsiveness) create posts via the UI → rpc_create_post_full,
 * which enforces an 8-posts-per-24h rate limit. Without a cross-spec wipe,
 * the full Playwright run trips the limit midway through. Call this from
 * each spec's `test.beforeAll` to keep runs independent.
 *
 * Hard delete only — the rate-limit query counts by `created_at >= now() - 24h`,
 * so soft-delete/archive would still count.
 */
export async function wipeSeedUserPosts(): Promise<void> {
  const admin = adminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    // Delete child `post` rows first. `post.thread_post_id` has
    // ON DELETE SET NULL, but a check constraint forbids the null-ed
    // state, so a direct thread_post DELETE silently rolls back when
    // any comment row still refers to it.
    const { data: seedPosts } = await admin
      .from('thread_post')
      .select('id')
      .eq('created_by', SEED_USER.userId);
    const ids = (seedPosts ?? []).map((p) => String(p.id));
    if (ids.length > 0) {
      await admin.from('post').delete().in('thread_post_id', ids);
    }
    await admin.from('thread_post').delete().eq('created_by', SEED_USER.userId);
    const { count } = await admin
      .from('thread_post')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', SEED_USER.userId);
    if ((count ?? 0) === 0) return;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });
  }
}

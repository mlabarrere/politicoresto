/**
 * E2E — Delta (« ça m'a fait réfléchir ») sur un post.
 * Le seed n'a pas de post : on en crée un (createTestPost), on se connecte
 * (seed user), on bascule le Delta deux fois (on/off via aria-pressed).
 */
import { expect, test } from '@playwright/test';
import { adminClient, createTestPost } from '../fixtures/supabase-admin';
import { signInAsSeedUser } from './helpers/auth';

let postSlug: string;
let postIds: { threadId: string; postItemId: string };

test.beforeAll(async () => {
  const created = await createTestPost(`Delta E2E post ${Date.now()}`);
  postSlug = created.slug;
  postIds = { threadId: created.threadId, postItemId: created.postItemId };
});

test.afterAll(async () => {
  const admin = adminClient();
  if (postIds?.postItemId) {
    await admin.from('post_delta').delete().eq('target_id', postIds.postItemId);
    await admin.from('thread_post').delete().eq('id', postIds.postItemId);
    await admin.from('topic').delete().eq('id', postIds.threadId);
  }
});

test('un membre connecté décerne puis retire le Delta', async ({ page }) => {
  await signInAsSeedUser(page);
  await page.goto(`/post/${postSlug}`);

  const delta = page.getByRole('button', { name: /fait réfléchir/i });
  await expect(delta).toBeVisible({ timeout: 10_000 });
  await expect(delta).toHaveAttribute('aria-pressed', 'false');

  await delta.click();
  await expect(delta).toHaveAttribute('aria-pressed', 'true');

  await delta.click();
  await expect(delta).toHaveAttribute('aria-pressed', 'false');
});

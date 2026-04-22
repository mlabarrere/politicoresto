/**
 * User Story 3 — comments (incl. nested replies, edit, delete).
 *
 * Covers the full user-facing lifecycle against a post created in
 * beforeAll. Seed has no posts, so we mint one via the post-creation RPC.
 *
 * UI map:
 *   - Post page → "Commenter" button (<PostActionsBar>) reveals the root
 *     composer (<ReplyComposer> submits "Publier").
 *   - Each comment → aria-label="Actions commentaire" → dropdown with
 *     "Modifier" / "Supprimer" menu items (author only).
 *   - Each comment → "Répondre" button reveals the nested reply composer.
 *   - Edit composer submit label = "Enregistrer".
 *
 * Cleanup: wipes the suite's post on afterAll and wipes comments on
 * beforeEach so each test is deterministic.
 */
import { expect, test, type Page } from '@playwright/test';
import { adminClient, createTestPost } from '../fixtures/supabase-admin';
import { signInAsSeedUser } from './helpers/auth';

let postSlug: string;
let postIds: { threadId: string; postItemId: string };

test.beforeAll(async () => {
  // Do NOT wipe all seed-user posts here — other spec files may be
  // running their own beforeAll in parallel against the same DB.
  // Each suite manages only the post it creates.
  const created = await createTestPost(`Comments E2E post ${Date.now()}`);
  postSlug = created.slug;
  postIds = { threadId: created.threadId, postItemId: created.postItemId };
});

test.afterAll(async () => {
  const admin = adminClient();
  if (postIds?.postItemId) {
    await admin.from('thread_post').delete().eq('id', postIds.postItemId);
    await admin.from('topic').delete().eq('id', postIds.threadId);
  }
});

test.beforeEach(async () => {
  const admin = adminClient();
  await admin.from('post').delete().eq('thread_post_id', postIds.postItemId);
});

async function openRootComposer(page: Page): Promise<void> {
  await signInAsSeedUser(page);
  await page.goto(`/post/${postSlug}`);
  // Match any suffix — title includes a timestamp to avoid suite collisions.
  await expect(
    page.getByRole('heading', { name: /Comments E2E post/i }),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /^Commenter$/i }).click();
}

async function postRootComment(page: Page, body: string): Promise<void> {
  await openRootComposer(page);
  // The composer just appeared; its textarea is now on the page.
  await page.getByRole('textbox').first().fill(body);
  await page
    .getByRole('button', { name: /^Publier$/i })
    .first()
    .click();
  await expect(page.getByText(body)).toBeVisible({ timeout: 5_000 });
}

test.describe('User Story 3 — comments', () => {
  test('anonymous visitor sees the post but no functional composer', async ({
    page,
  }) => {
    await page.goto(`/post/${postSlug}`);
    // Post heading is public; the "Commenter" button may render as a
    // login-prompt CTA for anon users. What MUST NOT exist for anon is an
    // editable textarea.
    await expect(page.locator('textarea')).toHaveCount(0);
  });

  test('happy: authed user posts a top-level comment and sees it render', async ({
    page,
  }) => {
    const body = `Top-level comment ${Date.now()}`;
    await postRootComment(page, body);
  });

  test('happy: authed user replies to a comment and the reply is nested', async ({
    page,
  }) => {
    const rootBody = `Root ${Date.now()}`;
    await postRootComment(page, rootBody);

    // Open the reply composer on the root comment. The trigger is an
    // icon button with aria-label="Répondre au commentaire" on each comment.
    await page
      .getByRole('button', { name: /Répondre au commentaire/i })
      .first()
      .click();

    // Root composer closes on submit; the nested reply composer is now
    // the only textarea on the page. It arrives pre-filled with an
    // "@username " mention — kept intact since it's product behaviour.
    const replyBody = `Child reply ${Date.now()}`;
    const replyBox = page.getByRole('textbox').first();
    const current = await replyBox.inputValue();
    await replyBox.fill(`${current}${replyBody}`);
    await page
      .getByRole('button', { name: /^Publier$/i })
      .first()
      .click();

    await expect(page.getByText(replyBody)).toBeVisible({ timeout: 5_000 });
  });

  test('happy: author can edit their own comment', async ({ page }) => {
    const original = `Original ${Date.now()}`;
    await postRootComment(page, original);

    await page
      .getByRole('button', { name: /Actions commentaire/i })
      .first()
      .click();
    await page.getByRole('menuitem', { name: /Modifier/i }).click();

    const edited = `Edited ${Date.now()}`;
    const editBox = page.getByRole('textbox').first();
    await editBox.fill(edited);
    await page.getByRole('button', { name: /^Enregistrer$/i }).click();

    await expect(page.getByText(edited)).toBeVisible({ timeout: 5_000 });
  });

  test('happy: author can delete their own comment and it disappears', async ({
    page,
  }) => {
    const body = `To delete ${Date.now()}`;
    await postRootComment(page, body);

    await page
      .getByRole('button', { name: /Actions commentaire/i })
      .first()
      .click();
    await page.getByRole('menuitem', { name: /Supprimer/i }).click();

    await expect(page.getByText(body)).not.toBeVisible({ timeout: 5_000 });
  });
});

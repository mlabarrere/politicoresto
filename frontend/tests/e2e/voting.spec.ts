/**
 * User Story 5 — left/right political-classification vote.
 *
 * PoliticoResto-specific mechanism: users tag each post / comment /
 * sub-comment as "gauche" (left) or "droite" (right). Not the user's
 * election-voting history (that's a separate story).
 *
 * UI map:
 *   - ReactionBar renders on posts (PostActionsBar), comments, and
 *     sub-comments — at every depth.
 *   - Left button: aria-label="C'est de gauche !"
 *   - Right button: aria-label="C'est de droite !"
 *   - Active state exposed via aria-pressed="true|false".
 *   - Count shown inside the button next to the icon.
 *   - Anonymous users see <AuthRequiredSheet>: clicking opens a login
 *     prompt rather than hitting the API.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  adminClient,
  createTestPost,
  SEED_USER,
} from '../fixtures/supabase-admin';
import { signInAsSeedUser } from './helpers/auth';

let postSlug: string;
let postIds: { threadId: string; postItemId: string };

test.beforeAll(async () => {
  // Do NOT wipe all seed-user posts here — other spec files may be
  // running their own beforeAll in parallel against the same DB.
  // We only manage the post we create.
  const created = await createTestPost(`Voting E2E post ${Date.now()}`);
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
  // Voting is the only spec that writes to `reaction`, so a broad wipe
  // is safe here. Comments on this suite's post get recreated per test.
  const admin = adminClient();
  await admin.from('reaction').delete().eq('user_id', SEED_USER.userId);
  await admin.from('post').delete().eq('thread_post_id', postIds.postItemId);
});

function leftButton(scope: Page | Locator): Locator {
  return scope.getByRole('button', { name: /C'est de gauche/i });
}
function rightButton(scope: Page | Locator): Locator {
  return scope.getByRole('button', { name: /C'est de droite/i });
}

test.describe('User Story 5 — left/right voting', () => {
  test('anonymous: clicking a vote button opens the auth sheet, no API call fired', async ({
    page,
  }) => {
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      if (req.url().endsWith('/api/reactions')) {
        apiCalls.push(req.method());
      }
    });

    await page.goto(`/post/${postSlug}`);
    await leftButton(page).first().click();

    // The AuthRequiredSheet renders a dialog. HeadlessUI may keep it at
    // visibility:hidden during transitions — assert on the open state
    // attribute instead of toBeVisible() which requires fully rendered.
    await expect(page.locator('[role="dialog"][data-open]')).toHaveCount(1, {
      timeout: 3_000,
    });
    // No POST must have been attempted to the reactions endpoint.
    expect(apiCalls).toEqual([]);
  });

  test('post: authed user casts a left vote → count increments, button becomes pressed', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${postSlug}`);

    // Scope to the top of the page so we target the POST's reaction bar,
    // not a comment's. The post's action bar sits right under the heading.
    const postHeading = page.getByRole('heading', { name: /Voting E2E post/i });
    await expect(postHeading).toBeVisible();

    const left = leftButton(page).first();
    await expect(left).toHaveAttribute('aria-pressed', 'false');
    await left.click();

    await expect(left).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10_000,
    });
    await expect(left).toContainText('1');
  });

  test('post: clicking same side a second time toggles the vote off', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${postSlug}`);

    const left = leftButton(page).first();
    await left.click();
    await expect(left).toHaveAttribute('aria-pressed', 'true');
    await left.click();
    await expect(left).toHaveAttribute('aria-pressed', 'false', {
      timeout: 10_000,
    });
    await expect(left).toContainText('0');
  });

  test('post: switching from left to right updates both sides in one click', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${postSlug}`);

    const left = leftButton(page).first();
    const right = rightButton(page).first();

    await left.click();
    await expect(left).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10_000,
    });

    await right.click();
    await expect(right).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10_000,
    });
    await expect(left).toHaveAttribute('aria-pressed', 'false');
    await expect(right).toContainText('1');
    await expect(left).toContainText('0');
  });

  test('comment: voting on a comment works independently from the post vote', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${postSlug}`);
    await expect(
      page.getByRole('heading', { name: /Voting E2E post/i }),
    ).toBeVisible();

    // Post a comment in-UI so we have something to vote on.
    await page.getByRole('button', { name: /^Commenter$/i }).click();
    const body = `Vote-on-me ${Date.now()}`;
    await page.getByRole('textbox').first().fill(body);
    await page
      .getByRole('button', { name: /^Publier$/i })
      .first()
      .click();
    await expect(page.getByText(body)).toBeVisible();

    // The page now has 2 left buttons: one on the post, one on the comment.
    // Comment's is the second (it appears later in DOM order).
    const commentLeft = leftButton(page).nth(1);
    await commentLeft.click();
    await expect(commentLeft).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10_000,
    });
    await expect(commentLeft).toContainText('1');

    // The post's vote button must still be inactive — the two votes are
    // independent rows with different (target_type, target_id).
    await expect(leftButton(page).first()).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('sub-comment (nested reply): vote bar is present and functional at depth≥1', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${postSlug}`);
    await expect(
      page.getByRole('heading', { name: /Voting E2E post/i }),
    ).toBeVisible();

    // Root comment.
    await page.getByRole('button', { name: /^Commenter$/i }).click();
    await page.getByRole('textbox').first().fill(`Root ${Date.now()}`);
    await page
      .getByRole('button', { name: /^Publier$/i })
      .first()
      .click();

    // Reply to it.
    await page
      .getByRole('button', { name: /Répondre au commentaire/i })
      .first()
      .click();
    const replyBody = `Sub ${Date.now()}`;
    const replyBox = page.getByRole('textbox').first();
    await replyBox.fill(replyBody);
    await page
      .getByRole('button', { name: /^Publier$/i })
      .first()
      .click();
    await expect(page.getByText(replyBody)).toBeVisible();

    // Now there are 3 left buttons on the page: post, root comment, reply.
    // The reply's is the 3rd.
    const replyLeft = leftButton(page).nth(2);
    await replyLeft.click();
    await expect(replyLeft).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10_000,
    });
  });
});

/**
 * User Story — Pronos lot 3 : a published prono is bettable. The user
 * clicks an option, the bet bar shows the pick optimistically, the DB
 * round-trip persists, and the aggregate share updates.
 */
import { expect, test } from '@playwright/test';
import {
  adminClient,
  createEphemeralUser,
  SEED_USER,
  userClient,
} from '../fixtures/supabase-admin';
import { signInAsSeedUser } from './helpers/auth';
import { wipeSeedUserPosts } from './helpers/cleanup';
import { setUserRoleByEmail } from './helpers/role';

test.describe('User Story — Pronos lot 3 (place bet)', () => {
  let modoEmail: string;
  let modoUserId: string;
  let topicSlug: string;
  let questionId: string;

  test.beforeAll(async () => {
    await wipeSeedUserPosts();
    await setUserRoleByEmail(SEED_USER.email, null);

    const eph = await createEphemeralUser('e2e-prono-vote-modo');
    modoEmail = eph.email;
    modoUserId = eph.userId;
    await setUserRoleByEmail(modoEmail, 'moderator');

    // Seed a published prono : the seed user requests via the real
    // RPC (so auth.uid() resolves correctly), then we flip the topic
    // to `open` via service role to short-circuit the moderator step.
    const seed = await userClient(SEED_USER.email);
    const { data: topicId, error: requestErr } = await seed.rpc(
      'rpc_request_prono',
      {
        p_title: `E2E vote ${Date.now()}`,
        p_question_text: 'Bayrou démissionnera-t-il avant le 1er janvier ?',
        p_options: ['Oui', 'Non'],
        p_allow_multiple: false,
      },
    );
    if (requestErr || typeof topicId !== 'string') {
      throw new Error(
        `seed prono failed: ${requestErr?.message ?? 'no topic id'}`,
      );
    }

    const admin = adminClient();
    await admin
      .from('topic')
      .update({ topic_status: 'open' })
      .eq('id', topicId);

    const { data: topicRow } = await admin
      .from('topic')
      .select('slug')
      .eq('id', topicId)
      .single();
    topicSlug = String(topicRow?.slug ?? '');

    const { data: question } = await admin
      .from('prono_question')
      .select('id')
      .eq('topic_id', topicId)
      .single();
    questionId = String(question?.id ?? '');
  });

  test.afterAll(async () => {
    const admin = adminClient();
    if (questionId) {
      await admin.from('prono_question').delete().eq('id', questionId);
    }
    const { data: topics } = await admin
      .from('topic')
      .select('id')
      .eq('created_by', SEED_USER.userId)
      .in('topic_status', ['pending_review', 'rejected', 'open']);
    const ids = (topics ?? []).map((t) => String(t.id));
    if (ids.length > 0) {
      await admin.from('post').delete().in('topic_id', ids);
      await admin.from('thread_post').delete().in('thread_id', ids);
      await admin.from('topic').delete().in('id', ids);
    }
    await admin.auth.admin.deleteUser(modoUserId).catch(() => undefined);
  });

  test('happy: signed-in user clicks an option → mon pari indicator', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${topicSlug}`);

    const ouiButton = page.getByRole('button', { name: /^Oui/ }).first();
    await expect(ouiButton).toBeVisible();
    await ouiButton.click({ force: true });
    await expect(ouiButton).toHaveAttribute('aria-pressed', 'true');
    await expect(ouiButton).toContainText(/Mon pari/);

    // DB sanity check : the bet exists for the seed user.
    const admin = adminClient();
    const { data: bets } = await admin
      .from('prono_bet')
      .select('user_id, option_id')
      .eq('question_id', questionId);
    expect(bets).toHaveLength(1);
    expect(bets![0]!.user_id).toBe(SEED_USER.userId);
  });

  test('switching options replaces the previous bet', async ({ page }) => {
    await signInAsSeedUser(page);
    await page.goto(`/post/${topicSlug}`);

    const nonButton = page.getByRole('button', { name: /^Non/ }).first();
    await nonButton.click({ force: true });
    await expect(nonButton).toHaveAttribute('aria-pressed', 'true');

    const admin = adminClient();
    const { data: bets } = await admin
      .from('prono_bet')
      .select('option_id')
      .eq('question_id', questionId)
      .eq('user_id', SEED_USER.userId);
    expect(bets).toHaveLength(1);
    const { data: nonOption } = await admin
      .from('prono_option')
      .select('id')
      .eq('question_id', questionId)
      .eq('label', 'Non')
      .single();
    expect(bets![0]!.option_id).toBe(nonOption?.id);
  });

  test('anonymous visitor cannot click options', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`/post/${topicSlug}`);
    const ouiButton = page.getByRole('button', { name: /^Oui/ }).first();
    await expect(ouiButton).toBeVisible();
    await expect(ouiButton).toBeDisabled();
  });
});

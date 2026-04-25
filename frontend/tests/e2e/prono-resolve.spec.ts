/**
 * User Story — Pronos lot 4 : moderator resolves a published prono via
 * /admin/pronos/[topicId], the topic flips to `resolved`, the public
 * page surfaces the resolution banner with the retroactive
 * multiplier breakdown for the bettor.
 */
import { expect, test } from '@playwright/test';
import {
  adminClient,
  createEphemeralUser,
  SEED_USER,
  userClient,
} from '../fixtures/supabase-admin';
import { signInAsSeedUser, signInAsUser } from './helpers/auth';
import { wipeSeedUserPosts } from './helpers/cleanup';
import { setUserRoleByEmail } from './helpers/role';

test.describe('User Story — Pronos lot 4 (resolve)', () => {
  let modoEmail: string;
  let modoUserId: string;
  let topicId: string;
  let topicSlug: string;
  let questionId: string;
  let ouiOptionId: string;

  test.beforeAll(async () => {
    await wipeSeedUserPosts();
    await setUserRoleByEmail(SEED_USER.email, null);

    const eph = await createEphemeralUser('e2e-prono-resolve-modo');
    modoEmail = eph.email;
    modoUserId = eph.userId;
    await setUserRoleByEmail(modoEmail, 'moderator');

    // Seed user submits the prono via the real RPC, modo flips it open
    // via service role (UI is exercised in lot 2 spec already).
    const seed = await userClient(SEED_USER.email);
    const { data: tid, error } = await seed.rpc('rpc_request_prono', {
      p_title: `E2E resolve ${Date.now()}`,
      p_question_text: 'Article sera-t-il signé avant le 31/12 ?',
      p_options: ['Oui', 'Non'],
      p_allow_multiple: false,
    });
    if (error || typeof tid !== 'string') {
      throw new Error(`seed prono failed: ${error?.message ?? 'no id'}`);
    }
    topicId = tid;

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

    const { data: ouiRow } = await admin
      .from('prono_option')
      .select('id')
      .eq('question_id', questionId)
      .eq('label', 'Oui')
      .single();
    ouiOptionId = String(ouiRow?.id ?? '');

    // Seed user places a bet on "Oui" (winning) so the retroactive
    // banner has something to display.
    const seedSign = await userClient(SEED_USER.email);
    await seedSign.rpc('rpc_place_bet', {
      p_question_id: questionId,
      p_option_id: ouiOptionId,
    });
  });

  test.afterAll(async () => {
    const admin = adminClient();
    if (topicId) {
      await admin.from('post').delete().eq('topic_id', topicId);
      await admin.from('thread_post').delete().eq('thread_id', topicId);
      await admin.from('topic').delete().eq('id', topicId);
    }
    await admin.auth.admin.deleteUser(modoUserId).catch(() => undefined);
  });

  test('admin resolves the prono and the public banner reflects it', async ({
    page,
  }) => {
    await signInAsUser(page, modoEmail);
    await page.goto(`/admin/pronos/${topicId}`);

    await expect(
      page.getByRole('heading', { name: /Trancher le pronostic/ }),
    ).toBeVisible();

    // Pick the "Oui" radio + submit. Use scrollIntoViewIfNeeded so the
    // mobile viewport (Pixel 5) reaches both controls before clicking.
    const ouiRadio = page.locator(
      `input[name="winning_option_ids"][value="${ouiOptionId}"]`,
    );
    await ouiRadio.scrollIntoViewIfNeeded();
    await ouiRadio.check();
    const submitBtn = page.getByRole('button', { name: /^Trancher$/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // After resolution, the page re-renders and the form is gone.
    // The "déjà résolu" message comes from EmptyState (rendered as a
    // div, not a heading) — match by text and use a longer timeout
    // because the server action runs the scoring loop synchronously.
    await expect(page.getByText(/Pronostic déjà résolu/)).toBeVisible({
      timeout: 15_000,
    });

    // DB sanity check.
    const admin = adminClient();
    const { data: topic } = await admin
      .from('topic')
      .select('topic_status')
      .eq('id', topicId)
      .single();
    expect(topic?.topic_status).toBe('resolved');

    const { data: bet } = await admin
      .from('prono_bet')
      .select('multiplier, smoothed_share, is_winner')
      .eq('question_id', questionId)
      .eq('user_id', SEED_USER.userId)
      .single();
    expect(typeof bet?.multiplier).toBe('number');
    expect(bet?.is_winner).toBe(true);

    // Public banner on /post/[slug] surfaces the verdict and the
    // retroactive breakdown for the seed user (the bettor).
    await page.context().clearCookies();
    await signInAsSeedUser(page);
    await page.goto(`/post/${topicSlug}`);
    await expect(page.getByText(/Verdict\s*:\s*Oui/)).toBeVisible();
    await expect(page.getByText(/Bon pari\s*!/)).toBeVisible();
  });
});

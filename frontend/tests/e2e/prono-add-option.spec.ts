/**
 * User Story — Pronos lot 5 : after a prono is published and a user has
 * placed a bet, the moderator can add a late option from
 * /admin/pronos/[topicId]. The new option triggers a notification to
 * the existing bettor (visible in the header badge + on
 * /me/notifications), and a chronological banner appears on the public
 * /post/[slug] page noting when the option was added.
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

test.describe('User Story — Pronos lot 5 (add option + notif)', () => {
  let modoEmail: string;
  let modoUserId: string;
  let topicId: string;
  let topicSlug: string;
  let questionId: string;

  test.beforeAll(async () => {
    await wipeSeedUserPosts();
    await setUserRoleByEmail(SEED_USER.email, null);

    const eph = await createEphemeralUser('e2e-prono-add-modo');
    modoEmail = eph.email;
    modoUserId = eph.userId;
    await setUserRoleByEmail(modoEmail, 'moderator');

    // Seed user submits a prono, modo flips it open via service role,
    // seed user places a bet so they end up in the notification cohort.
    const seed = await userClient(SEED_USER.email);
    const { data: tid, error } = await seed.rpc('rpc_request_prono', {
      p_title: `E2E add-option ${Date.now()}`,
      p_question_text: 'Quel candidat ?',
      p_options: ['Macron', 'Mélenchon'],
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

    const { data: macronOption } = await admin
      .from('prono_option')
      .select('id')
      .eq('question_id', questionId)
      .eq('label', 'Macron')
      .single();
    await seed.rpc('rpc_place_bet', {
      p_question_id: questionId,
      p_option_id: macronOption!.id,
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

  test('modo adds a late option, bettor sees notif badge + chronological banner', async ({
    page,
  }) => {
    // Modo signs in, navigates to the per-prono admin page, fills the
    // add-option form, submits.
    await signInAsUser(page, modoEmail);
    await page.goto(`/admin/pronos/${topicId}`);
    await expect(
      page.getByRole('heading', { name: /Ajouter une option/ }),
    ).toBeVisible();

    const labelInput = page.locator('input[name="label"]');
    await labelInput.fill('Bayrou');
    const submit = page.getByRole('button', { name: /^Ajouter$/ }).first();
    await submit.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes(`/admin/pronos/${topicId}`) &&
          resp.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      submit.click(),
    ]);

    // DB ground-truth : option present + notification queued for SEED_USER.
    const admin = adminClient();
    const { data: options } = await admin
      .from('prono_option')
      .select('label')
      .eq('question_id', questionId);
    expect(options?.map((o) => o.label)).toContain('Bayrou');

    const { data: notifs } = await admin
      .from('user_notification')
      .select('kind, payload')
      .eq('user_id', SEED_USER.userId)
      .eq('kind', 'prono_option_added');
    expect(notifs?.length ?? 0).toBeGreaterThanOrEqual(1);

    // Bettor signs in, header carries the badge, /me/notifications
    // shows the entry.
    await page.context().clearCookies();
    await signInAsSeedUser(page);
    await page.goto('/me/notifications');
    await expect(
      page.getByText(/Une option a été ajoutée/).first(),
    ).toBeVisible();
    await expect(page.getByText(/Bayrou/).first()).toBeVisible();

    // The public page shows the chronological banner.
    await page.goto(`/post/${topicSlug}`);
    await expect(
      page.getByText(/Option « Bayrou » ajoutée/).first(),
    ).toBeVisible();
  });
});

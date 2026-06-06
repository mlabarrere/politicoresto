/**
 * User Story — Pronos lot 6 : the /pronos list lets the visitor filter
 * by status (open / resolved / mine) and re-sort. This spec verifies
 * the chips render, the URL updates, and the seed user lands on
 * "Mes pronos" populated with their bet.
 */
import { expect, test } from '@playwright/test';
import { adminClient, SEED_USER, userClient } from '../fixtures/supabase-admin';
import { signInAsSeedUser } from './helpers/auth';
import { wipeSeedUserPosts } from './helpers/cleanup';

test.describe('User Story — Pronos lot 6 (list filters)', () => {
  let topicId: string;

  test.beforeAll(async () => {
    await wipeSeedUserPosts();

    // Seed user submits a prono and bets on it; service-role flips it
    // open so the bet exists on a published prono.
    const seed = await userClient(SEED_USER.email);
    const { data: tid, error } = await seed.rpc('rpc_request_prono', {
      p_title: `E2E filters ${Date.now()}`,
      p_question_text: 'Question filtre',
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

    const { data: question } = await admin
      .from('prono_question')
      .select('id')
      .eq('topic_id', topicId)
      .single();
    const { data: ouiOption } = await admin
      .from('prono_option')
      .select('id')
      .eq('question_id', question!.id)
      .eq('label', 'Oui')
      .single();
    await seed.rpc('rpc_place_bet', {
      p_question_id: question!.id,
      p_option_id: ouiOption!.id,
    });
  });

  test.afterAll(async () => {
    const admin = adminClient();
    if (topicId) {
      await admin.from('post').delete().eq('topic_id', topicId);
      await admin.from('thread_post').delete().eq('thread_id', topicId);
      await admin.from('topic').delete().eq('id', topicId);
    }
  });

  test('anonymous: chips render, "Mes pronos" disabled, sort works', async ({
    page,
  }) => {
    await page.goto('/pronos');
    await expect(
      page.getByRole('heading', { name: /Pronostics \(/ }),
    ).toBeVisible();

    await expect(page.getByRole('link', { name: /^Actifs$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // "Mes pronos" is rendered as a disabled span for anonymous visitors.
    const mineSpan = page.getByText(/^Mes pronos$/).first();
    await expect(mineSpan).toBeVisible();
    expect(await mineSpan.evaluate((el) => el.tagName)).toBe('SPAN');

    // Switching sort updates the URL.
    await page.getByRole('link', { name: /^Taille du panel$/ }).click();
    await expect(page).toHaveURL(/sort=panel/);
  });

  test('authed seed user: "Mes pronos" surfaces their bet', async ({
    page,
  }) => {
    await signInAsSeedUser(page);
    await page.goto('/pronos?status=mine');
    await expect(
      page.getByRole('link', { name: /^Mes pronos$/ }),
    ).toHaveAttribute('aria-pressed', 'true');

    // The prono created in beforeAll should appear because seed user
    // placed a bet on it.
    await expect(page.getByText(/Question filtre/)).toBeVisible();
  });
});

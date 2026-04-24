/**
 * User Story — affichage du résultat pondéré sur un sondage.
 *
 * Un utilisateur authentifié vote. Le front affiche immédiatement le
 * résultat brut. Une fois que le worker a tourné (dans nos tests on
 * force l'estimate via SQL), l'UI doit montrer :
 *   - la distribution RAW (toujours)
 *   - la distribution CORRIGÉE si confidence_score >= 40
 *   - le score de fiabilité + la bande (indicatif / correctable / robuste)
 *   - les intervalles de confiance 95 % sur les barres corrigées
 *   - un disclosure "Comment ce score est calculé ?" avec les 4 sous-scores
 *   - un lien vers /methodologie
 *
 * Deux flows :
 *   - band indicatif : pas de corrigé affiché, message "Échantillon trop petit"
 *   - band correctable/robuste : corrigé + CI
 */
import { expect, test } from '@playwright/test';
import { adminClient, createTestPoll } from '../fixtures/supabase-admin';
import { signInAsSeedUser } from './helpers/auth';

interface PollHandle {
  slug: string;
  threadId: string;
  postItemId: string;
  optionIds: string[];
}

async function seedEstimate(
  pollId: string,
  optionIds: [string, string],
  opts: {
    score: number;
    band: 'indicatif' | 'correctable' | 'robuste';
    rawA: number; // 0..1
    correctedA: number; // 0..1
    ci95AByOption?: [number, number];
    ci95BByOption?: [number, number];
  },
): Promise<void> {
  const admin = adminClient();
  const rawResults = [
    {
      option_id: optionIds[0],
      option_label: 'A',
      sort_order: 1,
      response_count: Math.round(opts.rawA * 100),
      weighted_count: null,
      share: Number((opts.rawA * 100).toFixed(2)),
    },
    {
      option_id: optionIds[1],
      option_label: 'B',
      sort_order: 2,
      response_count: Math.round((1 - opts.rawA) * 100),
      weighted_count: null,
      share: Number(((1 - opts.rawA) * 100).toFixed(2)),
    },
  ];
  const correctedResults = [
    {
      option_id: optionIds[0],
      option_label: 'A',
      sort_order: 1,
      response_count: Math.round(opts.rawA * 100),
      weighted_count: opts.correctedA,
      share: Number((opts.correctedA * 100).toFixed(2)),
    },
    {
      option_id: optionIds[1],
      option_label: 'B',
      sort_order: 2,
      response_count: Math.round((1 - opts.rawA) * 100),
      weighted_count: 1 - opts.correctedA,
      share: Number(((1 - opts.correctedA) * 100).toFixed(2)),
    },
  ];
  const corrected_ci95: Record<string, [number, number]> | null =
    opts.ci95AByOption && opts.ci95BByOption
      ? {
          [optionIds[0]]: opts.ci95AByOption,
          [optionIds[1]]: opts.ci95BByOption,
        }
      : null;

  // We call the RPC the worker uses so the sequencing matches prod.
  const { error } = await admin.rpc('weighting_upsert_estimate', {
    p_poll_id: pollId,
    p_n_respondents: 100,
    p_n_effective: 85,
    p_deff: 1.2,
    p_weight_top5_share: 0.08,
    p_coverage_share: 0.9,
    p_min_political_coverage: 0.8,
    p_confidence_score: opts.score,
    p_confidence_band: opts.band,
    p_confidence_components: {
      kish: 0.85,
      coverage: 0.9,
      variability: 0.83,
      concentration: 0.92,
    },
    p_raw_results: rawResults,
    p_corrected_results: opts.band === 'indicatif' ? null : correctedResults,
    p_corrected_ci95: corrected_ci95,
    p_computed_with_ref_as_of: '2021-01-01',
    p_is_final: false,
  });
  if (error) throw error;
}

async function createPoll(): Promise<PollHandle> {
  return createTestPoll({
    title: `Weighted-display E2E ${Date.now()}`,
    question: 'Pour ou contre ?',
    optionLabels: ['A', 'B'],
  });
}

test.describe('User Story — weighted poll display', () => {
  test('band correctable : corrigé + CI + sub-scores + link /methodologie', async ({
    page,
  }) => {
    const poll = await createPoll();
    try {
      const [optA, optB] = poll.optionIds;
      if (!optA || !optB) throw new Error('expected two option ids');
      await signInAsSeedUser(page);
      await page.goto(`/post/${poll.slug}`);
      // Cast a vote so the UI swaps from options to results.
      await page.getByRole('button', { name: /^A$/ }).click();
      await expect(page.getByText(/R[eé]sultat brut/)).toBeVisible({
        timeout: 10_000,
      });
      // Overwrite worker-computed estimate with our deterministic fixture.
      await seedEstimate(poll.postItemId, [optA, optB], {
        score: 62,
        band: 'correctable',
        rawA: 0.73,
        correctedA: 0.58,
        ci95AByOption: [0.53, 0.63],
        ci95BByOption: [0.37, 0.47],
      });
      await page.reload();

      await expect(page.getByText(/Fiabilit[eé] 62\/100/)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(/Correctable/)).toBeVisible();

      // Les deux distributions sont présentes.
      await expect(page.getByText(/R[eé]sultat redress[eé]/)).toBeVisible();
      await expect(page.getByText(/R[eé]sultat brut/)).toBeVisible();

      // Intervalle de confiance affiché à côté du pourcentage corrigé.
      await expect(page.getByText(/\(53\.0[–-]63\.0\)/)).toBeVisible();

      // Disclosure + lien méthodologie.
      await page.getByText(/Comment ce score est calcul[eé]/).click();
      await expect(page.getByText(/Taille effective/)).toBeVisible();
      await expect(
        page.getByRole('link', { name: /m[eé]thodologie/ }),
      ).toBeVisible();
    } finally {
      const admin = adminClient();
      await admin.from('thread_post').delete().eq('id', poll.postItemId);
      await admin.from('topic').delete().eq('id', poll.threadId);
    }
  });

  test('band indicatif : pas de corrigé, message "échantillon trop petit"', async ({
    page,
  }) => {
    const poll = await createPoll();
    try {
      const [optA, optB] = poll.optionIds;
      if (!optA || !optB) throw new Error('expected two option ids');
      await signInAsSeedUser(page);
      await page.goto(`/post/${poll.slug}`);
      await page.getByRole('button', { name: /^A$/ }).click();
      await expect(page.getByText(/R[eé]sultat brut/)).toBeVisible({
        timeout: 10_000,
      });
      await seedEstimate(poll.postItemId, [optA, optB], {
        score: 22,
        band: 'indicatif',
        rawA: 0.8,
        correctedA: 0.6,
      });
      await page.reload();

      await expect(page.getByText(/Fiabilit[eé] 22\/100/)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(/Indicatif/)).toBeVisible();

      // Avertissement affiché.
      await expect(
        page.getByText(/[eé]chantillon trop petit ou trop biais[eé]/i),
      ).toBeVisible();

      // Le résultat redressé n'est PAS affiché — seul le brut.
      await expect(page.getByText(/R[eé]sultat redress[eé]/)).toHaveCount(0);
      await expect(page.getByText(/R[eé]sultat brut/)).toBeVisible();
    } finally {
      const admin = adminClient();
      await admin.from('thread_post').delete().eq('id', poll.postItemId);
      await admin.from('topic').delete().eq('id', poll.threadId);
    }
  });

  test('/methodologie s affiche et mentionne Deville-Särndal', async ({
    page,
  }) => {
    await page.goto('/methodologie');
    await expect(
      page.getByRole('heading', {
        name: /M[eé]thodologie des sondages PoliticoResto/,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Deville/).first()).toBeVisible();
    await expect(page.getByText(/S[aä]rndal/).first()).toBeVisible();
    // Mentions clés de la doc.
    await expect(page.getByText(/samplics/).first()).toBeVisible();
    await expect(page.getByText(/INSEE/).first()).toBeVisible();
  });
});

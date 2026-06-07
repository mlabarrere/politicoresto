/**
 * Forum conversation DEMO — multi-account, end-to-end, against the real stack.
 *
 * This is not a narrow unit check: it stages a genuine political debate across
 * THREE distinct accounts and exercises every core forum mechanic the product
 * promises — long posts, short posts, threaded replies, in-text citation
 * (markdown quote), and the gauche/droite classification vote on posts AND on
 * comments. It captures a screenshot at each milestone into
 * `tests/e2e/demo-output/` so the run produces a visual gallery (uploaded as a
 * CI artifact), not just a green tick.
 *
 * Everything runs through the real UI + RPC + RLS path — the same code a human
 * user hits. Built from the exact helpers/selectors already proven in
 * voting.spec.ts and comments.spec.ts.
 *
 * Note on "citation": the product has no dedicated quote button; users cite
 * each other with a markdown blockquote inside a reply. The demo does exactly
 * that, so the screenshot shows a real quoted-rebuttal exchange.
 */
import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { adminClient, createEphemeralUser } from '../fixtures/supabase-admin';
import { signInAsUser } from './helpers/auth';

const OUT_DIR = 'tests/e2e/demo-output';

// Three personas with stable, readable handles (CI runs against a fresh DB).
const CAMILLE = 'camille_gauche';
const HUGO = 'hugo_droite';
const SOFIA = 'sofia_centre';

let camille: { email: string; userId: string };
let hugo: { email: string; userId: string };
let sofia: { email: string; userId: string };

let shotIndex = 0;
async function snap(page: Page, name: string): Promise<void> {
  shotIndex += 1;
  const file = `${OUT_DIR}/${String(shotIndex).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
}

function leftButton(scope: Page | Locator): Locator {
  return scope.getByRole('button', { name: /C'est de gauche/i });
}
function rightButton(scope: Page | Locator): Locator {
  return scope.getByRole('button', { name: /C'est de droite/i });
}

/** Switch the browser context to act as `email` (clears the prior session). */
async function actAs(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await signInAsUser(page, email);
}

/** Create a forum post through the real composer; return its slug. */
async function createPostViaUi(
  page: Page,
  opts: { title: string; body: string; party?: string },
): Promise<string> {
  await page.goto('/post/new');
  await page.locator('input[name="title"]').fill(opts.title);
  await page.locator('textarea[name="body"]').fill(opts.body);
  if (opts.party) {
    await page.getByRole('button', { name: opts.party }).click();
  }
  await page
    .getByRole('button', { name: /^Publier le post$/i })
    .click({ force: true });
  // The action writes the row then redirects away from /post/new.
  await expect(page).not.toHaveURL(/\/post\/new/, { timeout: 15_000 });

  const admin = adminClient();
  const { data } = await admin
    .from('topic')
    .select('slug')
    .eq('title', opts.title)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  const slug = (data as { slug?: string } | null)?.slug;
  if (!slug) throw new Error(`createPostViaUi: no slug for "${opts.title}"`);
  return slug;
}

/** Post a top-level comment on the currently-open post detail page. */
async function comment(page: Page, body: string): Promise<void> {
  await page.getByRole('button', { name: /^Commenter$/i }).click();
  await page.getByRole('textbox').first().fill(body);
  await page
    .getByRole('button', { name: /^Publier$/i })
    .first()
    .click();
  await expect(page.getByText(body, { exact: false })).toBeVisible({
    timeout: 10_000,
  });
}

/** Reply to the first comment on the page. */
async function reply(page: Page, body: string): Promise<void> {
  await page
    .getByRole('button', { name: /Répondre au commentaire/i })
    .first()
    .click();
  await page.getByRole('textbox').first().fill(body);
  await page
    .getByRole('button', { name: /^Publier$/i })
    .first()
    .click();
  await expect(page.getByText(body, { exact: false }).first()).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('Forum conversation demo (3 accounts, real debate)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    mkdirSync(OUT_DIR, { recursive: true });
    camille = await createEphemeralUser(CAMILLE);
    hugo = await createEphemeralUser(HUGO);
    sofia = await createEphemeralUser(SOFIA);
  });

  test.afterAll(async () => {
    // Best-effort cleanup — CI tears the stack down anyway; this keeps a
    // re-used local DB tidy. Never fail the run on cleanup.
    const admin = adminClient();
    for (const u of [camille, hugo, sofia]) {
      if (!u?.userId) continue;
      try {
        await admin.from('reaction').delete().eq('user_id', u.userId);
        const { data: posts } = await admin
          .from('thread_post')
          .select('id')
          .eq('created_by', u.userId);
        const ids = (posts ?? []).map((p) => String((p as { id: string }).id));
        if (ids.length > 0) {
          await admin.from('post').delete().in('thread_post_id', ids);
        }
        await admin.from('thread_post').delete().eq('created_by', u.userId);
        // Topics must go before the user: topic.created_by → app_profile has
        // no ON DELETE CASCADE, so a lingering topic blocks deleteUser() from
        // cascading away the profile, and the next local re-run would then hit
        // the unique app_profile.username constraint.
        await admin.from('topic').delete().eq('created_by', u.userId);
        await admin.auth.admin.deleteUser(u.userId);
      } catch {
        /* best effort */
      }
    }
  });

  test('a real debate unfolds across three accounts with votes', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    let articleSlug = '';

    await test.step('Camille opens a long, argued post (tagged PS)', async () => {
      await actAs(page, camille.email);
      articleSlug = await createPostViaUi(page, {
        title: 'Faut-il rétablir un impôt sur la grande fortune ?',
        party: '🌹 PS',
        body: [
          "Depuis la suppression de l'ISF en 2017, le débat n'a jamais vraiment",
          'cessé. Les défenseurs de la mesure y voyaient un signal envoyé aux',
          'investisseurs ; ses détracteurs, un cadeau fiscal aux plus aisés sans',
          "contrepartie mesurable sur l'emploi.",
          '',
          'Je propose ici de poser le débat froidement : **quels seraient les',
          "effets réels d'un impôt sur la grande fortune en 2026 ?** Rendement",
          "budgétaire, risque d'exil fiscal, justice de la contribution… Tout",
          'argument chiffré est bienvenu. Évitons les caricatures.',
        ].join('\n'),
      });
      await page.goto('/');
      await snap(page, 'feed-after-long-post');
      await page.goto(`/post/${articleSlug}`);
      await expect(
        page.getByRole('heading', { name: /grande fortune/i }),
      ).toBeVisible();
      await snap(page, 'long-post-detail');
    });

    await test.step('Hugo rebuts in a short comment and votes droite', async () => {
      await actAs(page, hugo.email);
      await page.goto(`/post/${articleSlug}`);
      await comment(
        page,
        "Court et net : l'ISF, c'était de la fuite de capitaux. Non au retour.",
      );
      const right = rightButton(page).first();
      await right.click();
      await expect(right).toHaveAttribute('aria-pressed', 'true', {
        timeout: 10_000,
      });
      await snap(page, 'hugo-comment-and-droite-vote');
    });

    await test.step('Sofia cites Hugo (markdown quote) and votes gauche', async () => {
      await actAs(page, sofia.email);
      await page.goto(`/post/${articleSlug}`);
      await reply(
        page,
        [
          "> l'ISF, c'était de la fuite de capitaux",
          '',
          "Les études de l'INSEE et de l'IPP nuancent fortement cet effet :",
          "l'exil concernait une minorité. On peut être en désaccord, mais pas",
          'sur des chiffres fantômes.',
        ].join('\n'),
      );
      // Vote gauche on the post…
      const postLeft = leftButton(page).first();
      await postLeft.click();
      await expect(postLeft).toHaveAttribute('aria-pressed', 'true', {
        timeout: 10_000,
      });
      // …and gauche on Hugo's comment (second left button in DOM order).
      const commentLeft = leftButton(page).nth(1);
      await commentLeft.click();
      await expect(commentLeft).toHaveAttribute('aria-pressed', 'true', {
        timeout: 10_000,
      });
      await snap(page, 'sofia-citation-reply-and-gauche-votes');
    });

    await test.step('Camille drops a short follow-up post', async () => {
      await actAs(page, camille.email);
      await createPostViaUi(page, {
        title: 'La VIᵉ République, on en parle vraiment ?',
        body: 'Question courte, vraie discussion : pour ou contre, et pourquoi ?',
      });
      await page.goto('/');
      await expect(
        page.getByText('La VIᵉ République', { exact: false }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByText('grande fortune', { exact: false }),
      ).toBeVisible();
      await snap(page, 'feed-two-posts-long-and-short');
    });

    await test.step('Final state: the full thread with votes', async () => {
      await page.goto(`/post/${articleSlug}`);
      await expect(
        page.getByText('fuite de capitaux', { exact: false }).first(),
      ).toBeVisible();
      await expect(
        page.getByText('chiffres fantômes', { exact: false }).first(),
      ).toBeVisible();
      await snap(page, 'final-thread-with-nested-reply');
    });
  });
});

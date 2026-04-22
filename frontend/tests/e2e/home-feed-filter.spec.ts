/**
 * Home feed — subject filter ribbon.
 *
 * Product spec: "filtering by a political/subject topic should smoothly
 * filter posts in the homepage without reloading — like a ribbon/tab
 * switcher."
 *
 * Implementation (components/home/subject-filter-bar.tsx +
 * components/home/post-feed.tsx): 24 posts are fetched once on
 * server render; clicking a subject chip is pure client-side state
 * (useState + useMemo applyFilter). URL never changes, no network
 * round-trip. This spec pins that contract.
 *
 * Setup: create two posts, one tagged with subject A, one untagged, so
 * the filter visibly changes the displayed count.
 */
import { expect, test } from '@playwright/test';
import { adminClient, SEED_USER, userClient } from '../fixtures/supabase-admin';

const SUBJECT_SLUG = 'presidentielle-2027';
const SUBJECT_LABEL = 'Présidentielle 2027';
let subjectId: string;

const created: { id: string; threadId: string; title: string }[] = [];
const TITLE_TAGGED = `Feed-filter tagged ${Date.now()}`;
const TITLE_UNTAGGED = `Feed-filter untagged ${Date.now()}`;

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: subjectRow } = await admin
    .from('subject')
    .select('id')
    .eq('slug', SUBJECT_SLUG)
    .single();
  if (!subjectRow?.id) {
    throw new Error(`subject ${SUBJECT_SLUG} not seeded`);
  }
  subjectId = String(subjectRow.id);

  const user = await userClient(SEED_USER.email);
  // Tagged post.
  const r1 = await user
    .rpc('rpc_create_post_full', {
      p_title: TITLE_TAGGED,
      p_body: 'tagged body',
      p_mode: 'post',
      p_subject_ids: [subjectId],
    })
    .single();
  if (r1.error) throw new Error(`create tagged: ${r1.error.message}`);
  const row1 = r1.data as { thread_id: string; post_item_id: string };
  created.push({
    id: row1.post_item_id,
    threadId: row1.thread_id,
    title: TITLE_TAGGED,
  });

  // Untagged post.
  const r2 = await user
    .rpc('rpc_create_post_full', {
      p_title: TITLE_UNTAGGED,
      p_body: 'untagged body',
      p_mode: 'post',
      p_subject_ids: [],
    })
    .single();
  if (r2.error) throw new Error(`create untagged: ${r2.error.message}`);
  const row2 = r2.data as { thread_id: string; post_item_id: string };
  created.push({
    id: row2.post_item_id,
    threadId: row2.thread_id,
    title: TITLE_UNTAGGED,
  });
});

test.afterAll(async () => {
  const admin = adminClient();
  for (const c of created) {
    await admin.from('thread_post').delete().eq('id', c.id);
    await admin.from('topic').delete().eq('id', c.threadId);
  }
});

test.describe('home feed — subject filter ribbon', () => {
  test('both posts render initially, then filter by subject hides the untagged one, toggling off restores both', async ({
    page,
  }) => {
    await page.goto('/');

    // Both posts visible before any filter.
    await expect(page.getByText(TITLE_TAGGED)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(TITLE_UNTAGGED)).toBeVisible({
      timeout: 10_000,
    });

    // Pin the URL so we can later prove it doesn't change.
    const urlBefore = page.url();

    // Click the subject chip. SubjectFilterBar button contains only the
    // subject name (+ optional emoji) — match by name.
    await page
      .getByRole('button', { name: new RegExp(SUBJECT_LABEL, 'i') })
      .first()
      .click();

    // Ribbon behaviour: only the tagged post remains in the list;
    // untagged is filtered out client-side.
    await expect(page.getByText(TITLE_TAGGED)).toBeVisible();
    await expect(page.getByText(TITLE_UNTAGGED)).toBeHidden();

    // URL must NOT have changed (no router navigation, no reload).
    expect(page.url()).toBe(urlBefore);

    // Click again → toggle off → both back.
    await page
      .getByRole('button', { name: new RegExp(SUBJECT_LABEL, 'i') })
      .first()
      .click();
    await expect(page.getByText(TITLE_TAGGED)).toBeVisible();
    await expect(page.getByText(TITLE_UNTAGGED)).toBeVisible();
    expect(page.url()).toBe(urlBefore);
  });

  test('no network request fires when toggling the filter (proves client-only)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText(TITLE_TAGGED)).toBeVisible({ timeout: 10_000 });

    const requests: string[] = [];
    page.on('request', (req) => {
      // Ignore static asset + HMR chatter — look for app/data requests.
      if (
        req.url().includes('/api/') ||
        /\/_next\/(server|data)/.exec(req.url()) ||
        req.url().endsWith('/')
      ) {
        requests.push(req.url());
      }
    });

    await page
      .getByRole('button', { name: new RegExp(SUBJECT_LABEL, 'i') })
      .first()
      .click();
    await expect(page.getByText(TITLE_UNTAGGED)).toBeHidden({
      timeout: 3_000,
    });

    // Allow a small number of background requests (telemetry, logger pings)
    // but NO data fetch for `/` or `/api/feed` etc.
    const feedRefetches = requests.filter(
      (u) =>
        u.endsWith(':3001/') ||
        u.includes('/api/feed') ||
        u.includes('_next/data'),
    );
    expect(feedRefetches).toEqual([]);
  });
});

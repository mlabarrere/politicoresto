import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Integration test support: read the local Supabase stack coordinates
 * via `supabase status -o env`. Fails loudly if the stack is not running.
 *
 * The service-role key is ONLY used from integration tests (Node, local,
 * never shipped). It is NOT the publishable key — it bypasses RLS.
 */
interface LocalSupabase {
  apiUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
  dbUrl: string;
}

let cached: LocalSupabase | null = null;

export function getLocalSupabase(): LocalSupabase {
  if (cached) return cached;

  let raw: string;
  try {
    raw = execSync('supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new Error(
      `Integration tests require the local Supabase stack. Run \`supabase start\`. Underlying error: ${(err as Error).message}`,
    );
  }

  const env = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const m = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
    if (m?.[1] !== undefined && m[2] !== undefined) env.set(m[1], m[2]);
  }

  const apiUrl = env.get('API_URL');
  const publishableKey = env.get('PUBLISHABLE_KEY') ?? env.get('ANON_KEY');
  const serviceRoleKey = env.get('SECRET_KEY') ?? env.get('SERVICE_ROLE_KEY');
  const dbUrl = env.get('DB_URL');

  if (!apiUrl || !publishableKey || !serviceRoleKey || !dbUrl) {
    throw new Error(
      'Integration tests could not parse local Supabase env from `supabase status -o env`.',
    );
  }

  cached = { apiUrl, publishableKey, serviceRoleKey, dbUrl };
  return cached;
}

/**
 * Service-role client. RLS-bypassing. Never used from app code — only
 * integration tests for setup/teardown and assertions against ground truth.
 */
export function adminClient(): SupabaseClient {
  const { apiUrl, serviceRoleKey } = getLocalSupabase();
  return createClient(apiUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Anon/publishable client acting as the given signed-in user. Exercises
 * RLS as the real app would, without using a password — the app is
 * Google-SSO-only, so integration tests must not depend on the password
 * grant as a back door. Instead, the service-role key mints a one-time
 * magic-link token and the user client redeems it via `verifyOtp`.
 *
 * Uses `@supabase/ssr` with an in-memory cookie jar so the resulting
 * session lives in the exact chunked `sb-*` cookie format the app
 * middleware expects. The returned SupabaseClient has an authenticated
 * session and will enforce RLS as that user.
 */
export async function userClient(email: string): Promise<SupabaseClient> {
  const admin = adminClient();
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(
      `userClient: generateLink failed for ${email}: ${linkError?.message ?? 'missing hashed_token'}`,
    );
  }

  const { apiUrl, publishableKey } = getLocalSupabase();
  const jar = new Map<string, { value: string; options: CookieOptions }>();
  const client = createServerClient(apiUrl, publishableKey, {
    cookies: {
      getAll: () =>
        Array.from(jar.entries()).map(([name, { value }]) => ({ name, value })),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          jar.set(name, { value, options: options ?? {} });
        }
      },
    },
  });

  const { error: verifyError } = await client.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyError) {
    throw new Error(
      `userClient: verifyOtp failed for ${email}: ${verifyError.message}`,
    );
  }
  return client;
}

export const SEED_USER = {
  email: 'test@example.com',
  userId: '00000000-0000-0000-0000-000000000001',
} as const;

/**
 * Create a second Supabase auth user with an `app_profile` row. Useful for
 * tests that need two distinct identities (e.g. RLS boundary checks, "user
 * A cannot edit user B's comment"). Caller is responsible for cleanup.
 */
export async function createEphemeralUser(
  handle: string,
): Promise<{ email: string; userId: string }> {
  const admin = adminClient();
  const email = `eph-${handle}-${Date.now()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(
      `createEphemeralUser failed: ${error?.message ?? 'no user returned'}`,
    );
  }
  const userId = data.user.id;

  const { error: profileErr } = await admin
    .from('app_profile')
    .upsert(
      { user_id: userId, username: handle, display_name: handle },
      { onConflict: 'user_id' },
    );
  if (profileErr) {
    throw new Error(
      `createEphemeralUser profile upsert failed: ${profileErr.message}`,
    );
  }

  return { email, userId };
}

/**
 * Create a poll post as the seed user. Returns slug + postItemId +
 * ordered option IDs. Caller owns cleanup (delete thread_post + topic).
 */
export async function createTestPoll(options: {
  title: string;
  question: string;
  optionLabels: readonly string[];
  deadlineHoursFromNow?: number;
}): Promise<{
  slug: string;
  threadId: string;
  postItemId: string;
  optionIds: string[];
}> {
  const adminPre = adminClient();
  // See createTestPost for the rationale: `post` rows must be hard-deleted
  // before `thread_post` rows, because post.thread_post_id has
  // ON DELETE SET NULL but a check constraint forbids the null-ed state.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: seedPosts } = await adminPre
      .from('thread_post')
      .select('id')
      .eq('created_by', SEED_USER.userId);
    const ids = (seedPosts ?? []).map((p) => String(p.id));
    if (ids.length > 0) {
      await adminPre.from('post').delete().in('thread_post_id', ids);
    }
    await adminPre
      .from('thread_post')
      .delete()
      .eq('created_by', SEED_USER.userId);
    const { count } = await adminPre
      .from('thread_post')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', SEED_USER.userId);
    if ((count ?? 0) === 0) break;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });
  }
  const user = await userClient(SEED_USER.email);
  const deadlineIso = new Date(
    Date.now() + (options.deadlineHoursFromNow ?? 24) * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await user
    .rpc('rpc_create_post_full', {
      p_title: options.title,
      p_mode: 'poll',
      p_poll_question: options.question,
      p_poll_options: options.optionLabels,
      p_poll_deadline_at: deadlineIso,
    })
    .single();
  if (error) throw new Error(`createTestPoll failed: ${error.message}`);
  const row = data as { thread_id: string; post_item_id: string };

  const admin = adminClient();
  const { data: topic } = await admin
    .from('topic')
    .select('slug')
    .eq('id', row.thread_id)
    .single();
  const { data: optionRows } = await admin
    .from('post_poll_option')
    .select('id, label, sort_order')
    .eq('post_item_id', row.post_item_id)
    .order('sort_order', { ascending: true });
  if (!topic?.slug || !optionRows) {
    throw new Error('createTestPoll: could not resolve slug or options');
  }

  return {
    slug: String(topic.slug),
    threadId: row.thread_id,
    postItemId: row.post_item_id,
    optionIds: optionRows.map((o) => String(o.id)),
  };
}

/**
 * Create a simple text post as the seed user and return the slug + ids.
 * Used by comment/reaction integration tests that need a post to attach to.
 * Caller is responsible for cleanup.
 */
export async function createTestPost(title: string): Promise<{
  slug: string;
  threadId: string;
  postItemId: string;
}> {
  // Pre-wipe seed-user posts so the 8/24h RPC rate limit never trips
  // across test files. We retry both the wipe *and* the creation: the
  // delete usually propagates immediately, but under load (many specs
  // run back-to-back in the full Playwright matrix) we occasionally see
  // 'Daily post limit reached' even after a fresh delete — so if the
  // create returns the rate-limit error we wipe + retry once more.
  const adminPre = adminClient();
  async function wipeSeedPosts() {
    for (let attempt = 0; attempt < 5; attempt++) {
      // Delete the child `post` rows first. `post.thread_post_id` has
      // ON DELETE SET NULL, but a check constraint forbids the null-ed
      // state, so a direct thread_post DELETE silently rolls back when
      // any `post` row refers to it (typical after comment-creating
      // specs have run). Hard-deleting children first sidesteps the
      // constraint and lets the thread_post DELETE actually take effect.
      const { data: seedPosts } = await adminPre
        .from('thread_post')
        .select('id')
        .eq('created_by', SEED_USER.userId);
      const ids = (seedPosts ?? []).map((p) => String(p.id));
      if (ids.length > 0) {
        await adminPre.from('post').delete().in('thread_post_id', ids);
      }
      await adminPre
        .from('thread_post')
        .delete()
        .eq('created_by', SEED_USER.userId);
      const { count } = await adminPre
        .from('thread_post')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', SEED_USER.userId);
      if ((count ?? 0) === 0) return;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 150);
      });
    }
  }

  await wipeSeedPosts();
  const user = await userClient(SEED_USER.email);
  let data: unknown = null;
  let error: { message: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await user
      .rpc('rpc_create_post_full', {
        p_title: title,
        p_body: 'integration-test body',
        p_mode: 'post',
      })
      .single();
    data = res.data;
    error = res.error;
    if (!error) break;
    if (!/daily post limit/i.test(error.message)) break;
    await wipeSeedPosts();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
  }
  if (error) {
    throw new Error(`createTestPost failed: ${error.message}`);
  }
  const row = data as { thread_id: string; post_item_id: string };

  const admin = adminClient();
  const { data: topic } = await admin
    .from('topic')
    .select('slug')
    .eq('id', row.thread_id)
    .single();
  if (!topic?.slug) {
    throw new Error('createTestPost: could not resolve slug');
  }

  return {
    slug: String(topic.slug),
    threadId: row.thread_id,
    postItemId: row.post_item_id,
  };
}

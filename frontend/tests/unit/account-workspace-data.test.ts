import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountWorkspaceData } from '@/lib/data/authenticated/account-workspace';
import { createServerSupabaseClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

type QueryResult = {
  data: unknown;
  error: { message?: string; code?: string } | null;
};

function makeQuery(result: QueryResult) {
  const query = {
    eq: vi.fn(() => query),
    order: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    in: vi.fn(async () => result),
  };
  return query;
}

function makeSupabase({
  tables,
  rpcs,
}: {
  tables: Record<string, QueryResult>;
  rpcs: Record<string, QueryResult>;
}) {
  return {
    auth: {
      getClaims: vi.fn(async () => ({
        data: { claims: { sub: 'u1', email: 'user@example.com' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn(() =>
        makeQuery(tables[table] ?? { data: [], error: null }),
      ),
    })),
    rpc: vi.fn(async (fn: string) => rpcs[fn] ?? { data: [], error: null }),
  };
}

describe('account workspace data', () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
  });

  it('returns ready statuses when dependencies are available', async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        tables: {
          app_profile: {
            data: {
              user_id: 'u1',
              username: 'alice',
              display_name: 'Alice',
              bio: null,
              avatar_url: null,
              profile_status: 'active',
              is_public_profile_enabled: true,
              created_at: '2026-04-16',
            },
            error: null,
          },
          user_visibility_settings: {
            data: {
              display_name_visibility: 'public',
              bio_visibility: 'public',
              vote_history_visibility: 'private',
            },
            error: null,
          },
          thread_post: { data: [], error: null },
          v_thread_posts: { data: [], error: null },
          v_post_comments: { data: [], error: null },
        },
        rpcs: {
          rpc_get_private_political_profile: {
            data: {
              political_interest_level: 3,
              notes_private: null,
              profile_payload: {},
            },
            error: null,
          },
        },
      }) as never,
    );

    const data = await getAccountWorkspaceData();

    expect(data.sectionStatus.profile.state).toBe('ready');
    expect(data.sectionStatus.posts.state).toBe('ready');
  });

  it('marks sections unavailable when schema objects are missing', async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        tables: {
          app_profile: {
            data: {
              user_id: 'u1',
              username: 'alice',
              display_name: 'Alice',
              bio: null,
              avatar_url: null,
              profile_status: 'active',
              is_public_profile_enabled: true,
              created_at: '2026-04-16',
            },
            error: null,
          },
          user_visibility_settings: {
            data: null,
            error: {
              message:
                "Could not find the table 'public.user_visibility_settings' in the schema cache",
            },
          },
          thread_post: { data: [], error: null },
          v_thread_posts: {
            data: null,
            error: {
              message:
                "Could not find the table 'public.v_thread_posts' in the schema cache",
            },
          },
          v_post_comments: { data: [], error: null },
        },
        rpcs: {
          rpc_get_private_political_profile: {
            data: {
              political_interest_level: null,
              notes_private: null,
              profile_payload: {},
            },
            error: null,
          },
        },
      }) as never,
    );

    const data = await getAccountWorkspaceData();

    expect(data.sectionStatus.profile.state).toBe('unavailable');
    expect(data.sectionStatus.posts.state).toBe('unavailable');
    expect(data.publications).toEqual([]);
  });

  it('marks section error on runtime failures', async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        tables: {
          app_profile: {
            data: {
              user_id: 'u1',
              username: 'alice',
              display_name: 'Alice',
              bio: null,
              avatar_url: null,
              profile_status: 'active',
              is_public_profile_enabled: true,
              created_at: '2026-04-16',
            },
            error: null,
          },
          user_visibility_settings: { data: null, error: null },
          thread_post: { data: [], error: null },
          v_thread_posts: {
            data: [],
            error: { message: 'statement timeout', code: '57014' },
          },
          v_post_comments: { data: [], error: null },
        },
        rpcs: {
          rpc_get_private_political_profile: {
            data: {
              political_interest_level: null,
              notes_private: null,
              profile_payload: {},
            },
            error: null,
          },
        },
      }) as never,
    );

    const data = await getAccountWorkspaceData();

    expect(data.sectionStatus.posts.state).toBe('error');
    expect(data.sectionStatus.posts.message).toContain(
      'Indisponible temporairement',
    );
    expect(data.publications).toEqual([]);
  });
});

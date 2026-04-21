import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublicProfile } from '@/lib/data/public/profile';

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

type FromTable = 'app_profile' | 'v_thread_posts' | 'v_post_comments' | 'topic';

function makeClient({
  profile = {
    user_id: 'u1',
    username: 'citoyen',
    display_name: 'Jean',
    bio: 'Ma bio',
    created_at: '2026-01-01',
  },
  profileError = null as unknown,
  posts = [] as unknown[],
  postsError = null as unknown,
  comments = [] as unknown[],
  commentsError = null as unknown,
  topics = [] as unknown[],
  topicsError = null as unknown,
} = {}) {
  return {
    from: vi.fn().mockImplementation((table: FromTable) => {
      if (table === 'app_profile') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: async () => ({
                    data: profile,
                    error: profileError,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'v_thread_posts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi
                  .fn()
                  .mockResolvedValue({ data: posts, error: postsError }),
              }),
            }),
          }),
        };
      }
      if (table === 'v_post_comments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi
                  .fn()
                  .mockResolvedValue({ data: comments, error: commentsError }),
              }),
            }),
          }),
        };
      }
      if (table === 'topic') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: topics, error: topicsError }),
          }),
        };
      }
      return {};
    }),
  };
}

describe('getPublicProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns null when profile not found', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ profile: null as never }),
    );
    const result = await getPublicProfile('unknown');
    expect(result).toBeNull();
  });

  it('throws when profile fetch errors', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        profile: null as never,
        profileError: { message: 'db error' },
      }),
    );
    await expect(getPublicProfile('citoyen')).rejects.toEqual({
      message: 'db error',
    });
  });

  it('returns profile data with empty posts and comments', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const result = await getPublicProfile('citoyen');
    expect(result?.profile.username).toBe('citoyen');
    expect(result?.profile.bio).toBe('Ma bio');
    expect(result?.posts).toHaveLength(0);
    expect(result?.comments).toHaveLength(0);
  });

  it('throws when posts fetch errors', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ postsError: { message: 'posts error' } }),
    );
    await expect(getPublicProfile('citoyen')).rejects.toEqual({
      message: 'posts error',
    });
  });

  it('throws when comments fetch errors', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ commentsError: { message: 'comments error' } }),
    );
    await expect(getPublicProfile('citoyen')).rejects.toEqual({
      message: 'comments error',
    });
  });

  it('maps posts with thread slugs when topics available', async () => {
    const posts = [
      {
        id: 'p1',
        thread_id: 't1',
        title: 'Mon post',
        content: 'Corps',
        created_at: '2026-01-01',
      },
    ];
    const topics = [{ id: 't1', slug: 'mon-post-slug' }];
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ posts, topics }),
    );
    const result = await getPublicProfile('citoyen');
    expect(result?.posts[0]!.thread_slug).toBe('mon-post-slug');
    expect(result?.posts[0]!.title).toBe('Mon post');
  });

  it('maps comments with thread slugs', async () => {
    const comments = [
      {
        id: 'c1',
        thread_id: 't1',
        body_markdown: 'Mon commentaire',
        created_at: '2026-01-01',
      },
    ];
    const topics = [{ id: 't1', slug: 'le-topic' }];
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ comments, topics }),
    );
    const result = await getPublicProfile('citoyen');
    expect(result?.comments[0]!.thread_slug).toBe('le-topic');
    expect(result?.comments[0]!.body_markdown).toBe('Mon commentaire');
  });

  it('handles posts with no matching topic slug (empty string fallback)', async () => {
    const posts = [
      {
        id: 'p1',
        thread_id: 'orphan-t',
        title: null,
        content: null,
        created_at: '2026-01-01',
      },
    ];
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient({ posts }));
    const result = await getPublicProfile('citoyen');
    expect(result?.posts[0]!.thread_slug).toBe('');
  });
});

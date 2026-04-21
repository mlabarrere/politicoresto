import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPostDetail } from '@/lib/data/public/posts';
import { createServerSupabaseClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

type QueryResult = {
  data: unknown;
  error: { message?: string; code?: string } | null;
};

function makeScopedQuery(getResult: (scope: string) => QueryResult) {
  return {
    eq: vi.fn((scope: string) => ({
      order: vi.fn(async () => getResult(scope)),
    })),
  };
}

describe('getPostDetail canonical scope', () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
  });

  it('reads topic, posts and comments from thread-first views', async () => {
    const topic = {
      id: 'topic-1',
      slug: 'topic-1',
      title: 'Topic 1',
      topic_status: 'open',
      effective_visibility: 'public',
      open_at: '2026-04-14T00:00:00.000Z',
      close_at: '2026-04-21T00:00:00.000Z',
      created_at: '2026-04-14T00:00:00.000Z',
    };

    const postRows = [
      {
        id: 'post-item-1',
        thread_id: 'topic-1',
        type: 'article',
        title: 'Titre',
        content: 'Contenu',
        created_by: 'u1',
        username: 'alice',
        display_name: 'Alice',
        created_at: '2026-04-14T01:00:00.000Z',
        updated_at: '2026-04-14T01:00:00.000Z',
        status: 'published',
        gauche_count: 1,
        droite_count: 0,
        weighted_votes: 1,
        comment_count: 1,
      },
    ];

    const commentRows = [
      {
        id: 'comment-1',
        thread_id: 'topic-1',
        thread_post_id: 'post-item-1',
        parent_post_id: null,
        depth: 0,
        author_user_id: 'u2',
        username: 'bob',
        display_name: 'Bob',
        title: null,
        body_markdown: 'Commentaire',
        created_at: '2026-04-14T02:00:00.000Z',
        updated_at: '2026-04-14T02:00:00.000Z',
        post_status: 'visible',
        gauche_count: 0,
        droite_count: 0,
        comment_score: 0,
      },
    ];

    mockedCreateServerSupabaseClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'v_thread_detail') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: topic, error: null })),
              })),
            })),
          };
        }

        if (table === 'v_thread_posts') {
          return {
            select: vi.fn(() =>
              makeScopedQuery((scope) =>
                scope === 'thread_id'
                  ? { data: postRows, error: null }
                  : {
                      data: null,
                      error: { code: '42703', message: 'Unexpected scope' },
                    },
              ),
            ),
          };
        }

        if (table === 'v_post_comments') {
          return {
            select: vi.fn(() =>
              makeScopedQuery((scope) =>
                scope === 'thread_id'
                  ? { data: commentRows, error: null }
                  : {
                      data: null,
                      error: { code: '42703', message: 'Unexpected scope' },
                    },
              ),
            ),
          };
        }

        if (table === 'post') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({ data: [], error: null })),
            })),
          };
        }

        if (table === 'v_post_poll_summary') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({ data: [], error: null })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const detail = await getPostDetail('topic-1', null);

    expect(detail?.post?.slug).toBe('topic-1');
    expect(detail?.posts).toHaveLength(1);
    expect(detail?.comments).toHaveLength(1);
    expect(detail?.comments[0]?.post_id).toBe('topic-1');
  });
});

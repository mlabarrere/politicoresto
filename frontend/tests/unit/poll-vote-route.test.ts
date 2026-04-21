import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/polls/vote/route';
import { createServerSupabaseClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/polls/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('poll vote route', () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
  });

  it('rejects unauthenticated request', async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getClaims: vi
          .fn()
          .mockResolvedValue({ data: { claims: null }, error: null }),
      },
    } as never);

    const response = await POST(
      makeRequest({ postItemId: 'p1', optionId: 'o1' }),
    );
    expect(response.status).toBe(401);
  });

  it('rejects invalid payload', async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getClaims: vi
          .fn()
          .mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null }),
      },
    } as never);

    const response = await POST(makeRequest({ foo: 'bar' }));
    expect(response.status).toBe(400);
  });

  it('returns safe error message when vote rpc fails', async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getClaims: vi
          .fn()
          .mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ error: { message: 'Poll is closed' } }),
    } as never);

    const response = await POST(
      makeRequest({ postItemId: 'p1', optionId: 'o1' }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Poll vote failed',
    });
  });

  it('returns normalized poll payload on success', async () => {
    // Le RPC retourne SETOF v_post_poll_summary — un tableau de lignes.
    const pollRow = {
      post_item_id: 'p1',
      post_id: 't1',
      post_slug: 'slug',
      post_title: 'Title',
      question: 'Q?',
      deadline_at: '2026-04-18T10:00:00.000Z',
      poll_status: 'open',
      sample_size: 20,
      effective_sample_size: 14,
      representativity_score: 55,
      coverage_score: 60,
      distance_score: 45,
      stability_score: 50,
      anti_brigading_score: 70,
      raw_results: [],
      corrected_results: [],
      options: [],
      selected_option_id: 'o1',
    };

    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getClaims: vi
          .fn()
          .mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: [pollRow], error: null }),
    } as never);

    const response = await POST(
      makeRequest({ postItemId: 'p1', optionId: 'o1' }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        poll: expect.objectContaining({
          post_item_id: 'p1',
          selected_option_id: 'o1',
        }),
      }),
    );
  });
});

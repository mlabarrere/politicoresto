import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAuthMock } from '../fixtures/auth-mock';

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getClaims: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { POST } from '@/app/api/reactions/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/reactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeClient({
  userId = 'user-1',
  userNull = false,
  existingReaction = null,
  existingError = null,
  rpcError = null,
  countsData = { gauche_count: 3, droite_count: 1 },
  countsError = null,
}: {
  userId?: string;
  userNull?: boolean;
  existingReaction?: unknown;
  existingError?: unknown;
  rpcError?: unknown;
  countsData?: unknown;
  countsError?: unknown;
} = {}) {
  const maybeSingleExisting = vi.fn().mockResolvedValue({
    data: existingReaction,
    error: existingError,
  });
  const maybeSingleCounts = vi.fn().mockResolvedValue({
    data: countsData,
    error: countsError,
  });

  const eqChainCounts = { maybeSingle: maybeSingleCounts };
  const eqCounts = vi.fn().mockReturnValue(eqChainCounts);
  const selectCounts = vi.fn().mockReturnValue({ eq: eqCounts });

  let callCount = 0;
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'reaction' && callCount === 0) {
      callCount++;
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ maybeSingle: maybeSingleExisting }),
            }),
          }),
        }),
      };
    }
    // v_thread_posts or v_post_comments
    return { select: selectCounts };
  });

  return {
    auth: makeAuthMock(userNull ? null : userId),
    from: fromMock,
    rpc: vi.fn().mockResolvedValue({ error: rpcError, data: null }),
  };
}

describe('POST /api/reactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ userNull: true }),
    );
    const response = await POST(
      makeRequest({ targetType: 'post', targetId: 'x', side: 'gauche' }),
    );
    expect(response.status).toBe(401);
  });

  it('returns 400 when payload is invalid', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await POST(
      makeRequest({ targetType: 'invalid', targetId: '', side: 'gauche' }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('invalid');
  });

  it('returns 400 on existing reaction fetch error', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ existingError: { message: 'db error', code: '500' } }),
    );
    const response = await POST(
      makeRequest({ targetType: 'post', targetId: 'post-1', side: 'gauche' }),
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 when rpc fails', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ rpcError: { message: 'rpc error', code: '500' } }),
    );
    const response = await POST(
      makeRequest({ targetType: 'post', targetId: 'post-1', side: 'gauche' }),
    );
    expect(response.status).toBe(400);
  });

  it('returns leftVotes and rightVotes on success', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ countsData: { gauche_count: 5, droite_count: 2 } }),
    );
    const response = await POST(
      makeRequest({ targetType: 'post', targetId: 'post-1', side: 'gauche' }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.leftVotes).toBe(5);
    expect(body.rightVotes).toBe(2);
  });

  it('handles left/right aliases for side', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await POST(
      makeRequest({ targetType: 'post', targetId: 'post-1', side: 'left' }),
    );
    expect(response.status).toBe(200);
  });

  it('handles comment targetType', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await POST(
      makeRequest({
        targetType: 'comment',
        targetId: 'comment-1',
        side: 'droite',
      }),
    );
    expect(response.status).toBe(200);
  });

  it('returns 400 when counts read fails', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        countsError: { message: 'counts error', code: '500' },
        countsData: null,
      }),
    );
    const response = await POST(
      makeRequest({ targetType: 'post', targetId: 'post-1', side: 'gauche' }),
    );
    expect(response.status).toBe(400);
  });
});

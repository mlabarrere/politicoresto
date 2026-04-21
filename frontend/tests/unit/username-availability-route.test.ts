import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/account/username-availability/route';
import { makeAuthMock } from '../fixtures/auth-mock';

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getClaims: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

function makeRequest(value: string) {
  return new Request(
    `http://localhost/api/account/username-availability?value=${encodeURIComponent(value)}`,
  );
}

function makeClient({
  userId = 'user-1',
  userNull = false,
  currentUsername = 'citoyen_actif',
  duplicateData = null,
  queryError = null,
}: {
  userId?: string;
  userNull?: boolean;
  currentUsername?: string;
  duplicateData?: unknown;
  queryError?: unknown;
} = {}) {
  return {
    auth: makeAuthMock(userNull ? null : userId),
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: async () => ({
            data: { username: currentUsername },
            error: queryError,
          }),
          neq: vi.fn().mockReturnValue({
            maybeSingle: async () => ({
              data: duplicateData,
              error: queryError,
            }),
          }),
        }),
      }),
    })),
  };
}

describe('gET /api/account/username-availability', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns available=false with reason when username is invalid', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(makeClient());
    const response = await GET(makeRequest('ab')); // too short
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.available).toBe(false);
    expect(body.reason).toBeTruthy();
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ userNull: true }),
    );
    const response = await GET(makeRequest('citoyen_ok'));
    expect(response.status).toBe(401);
  });

  it('returns available=true when username is free', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ currentUsername: 'other_user', duplicateData: null }),
    );
    const response = await GET(makeRequest('citoyen_ok'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.available).toBe(true);
    expect(body.isCurrentUsername).toBe(false);
  });

  it('returns isCurrentUsername=true when username matches current user', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ currentUsername: 'citoyen_ok', duplicateData: null }),
    );
    const response = await GET(makeRequest('citoyen_ok'));
    const body = await response.json();
    expect(body.isCurrentUsername).toBe(true);
  });

  it('returns available=false when username is taken by another user', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({
        currentUsername: 'my_name',
        duplicateData: { user_id: 'other-user' },
      }),
    );
    const response = await GET(makeRequest('taken_name'));
    const body = await response.json();
    expect(body.available).toBe(false);
    expect(body.reason).toContain('deja pris');
  });

  it('returns 500 when query fails', async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      makeClient({ queryError: { message: 'db error', code: '500' } }),
    );
    const response = await GET(makeRequest('citoyen_ok'));
    expect(response.status).toBe(500);
  });
});

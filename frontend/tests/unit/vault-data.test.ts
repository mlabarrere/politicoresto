import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getVaultSettingsData } from '@/lib/data/authenticated/vault';

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

describe('getVaultSettingsData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: mocks.rpcMock,
    });
  });

  it('returns profile data when rpc succeeds', async () => {
    const profile = {
      user_id: 'user-1',
      political_interest_level: 3,
      notes_private: 'notes',
      profile_payload: null,
      updated_at: new Date().toISOString(),
    };
    mocks.rpcMock.mockResolvedValue({ data: profile, error: null });
    const result = await getVaultSettingsData();
    expect(result.profile).toEqual(profile);
    expect(result.error).toBeNull();
  });

  it('returns null profile when rpc returns null data', async () => {
    mocks.rpcMock.mockResolvedValue({ data: null, error: null });
    const result = await getVaultSettingsData();
    expect(result.profile).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error string when rpc fails', async () => {
    mocks.rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'rpc error' },
    });
    const result = await getVaultSettingsData();
    expect(result.error).toContain('rpc error');
  });
});

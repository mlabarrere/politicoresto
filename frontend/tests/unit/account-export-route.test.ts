import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/account/export/route';

const mocks = vi.hoisted(() => ({
  getAccountWorkspaceData: vi.fn(),
}));

vi.mock('@/lib/data/authenticated/account-workspace', () => ({
  getAccountWorkspaceData: mocks.getAccountWorkspaceData,
}));

describe('gET /api/account/export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns JSON data with 200 and content-disposition header', async () => {
    const fakeData = { userId: 'user-1', email: 'user@example.com' };
    mocks.getAccountWorkspaceData.mockResolvedValue(fakeData);
    const response = await GET();
    expect(response.status).toBe(200);
    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('application/json');
    const disposition = response.headers.get('content-disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('politicoresto-account-export');
  });

  it('returns parseable JSON body', async () => {
    const fakeData = { userId: 'user-1', sectionStatus: {} };
    mocks.getAccountWorkspaceData.mockResolvedValue(fakeData);
    const response = await GET();
    const body = await response.json();
    expect(body.userId).toBe('user-1');
  });

  it('returns 500 when getAccountWorkspaceData throws', async () => {
    mocks.getAccountWorkspaceData.mockRejectedValue(new Error('export failed'));
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Export impossible');
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  canCreateCommentToday,
  RATE_LIMIT_MESSAGES,
} from '@/lib/security/rate-limit';

function mockSupabase(count: number | null, error: boolean = false) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi
      .fn()
      .mockResolvedValue(
        error
          ? { count: null, error: { message: 'db error' } }
          : { count, error: null },
      ),
  };
  return { from: vi.fn().mockReturnValue(chain) } as never;
}

describe('canCreateCommentToday', () => {
  it('allows when under the daily limit', async () => {
    const result = await canCreateCommentToday(mockSupabase(10), 'user-1');
    expect(result.allowed).toBe(true);
  });

  it('blocks when at limit', async () => {
    const result = await canCreateCommentToday(mockSupabase(40), 'user-1');
    expect(result.allowed).toBe(false);
  });

  it('blocks on db error', async () => {
    const result = await canCreateCommentToday(
      mockSupabase(null, true),
      'user-1',
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('rate_limit_check_failed');
  });
});

describe('RATE_LIMIT_MESSAGES', () => {
  it('has comment message', () => {
    expect(RATE_LIMIT_MESSAGES.comment).toContain('40');
  });
});

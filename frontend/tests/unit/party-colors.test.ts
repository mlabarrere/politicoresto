import { describe, expect, it } from 'vitest';

import { getPartyTheme, initials } from '@/lib/ui/party-colors';

describe('getPartyTheme', () => {
  it('returns a theme for known parties', () => {
    const theme = getPartyTheme('rn');
    expect(theme.bg.startsWith('#')).toBe(true);
    expect(theme.fg.startsWith('#')).toBe(true);
    expect(theme.ring.startsWith('#')).toBe(true);
  });

  it('returns the fallback theme for unknown slugs', () => {
    const theme = getPartyTheme('unknown-xyz');
    expect(theme.bg).toBe('#94a3b8');
  });

  it('returns the fallback theme for null', () => {
    const theme = getPartyTheme(null);
    expect(theme.bg).toBe('#94a3b8');
  });
});

describe('initials', () => {
  it('derives initials from full name', () => {
    expect(initials('Emmanuel Macron')).toBe('EM');
  });

  it('handles single-name inputs', () => {
    expect(initials('Macron')).toBe('MA');
  });

  it('falls back on empty / null', () => {
    expect(initials('')).toBe('?');
    expect(initials(null)).toBe('?');
    expect(initials(undefined)).toBe('?');
  });

  it('ignores punctuation', () => {
    expect(initials('Jean-Luc Melenchon')).toBe('JM');
  });
});

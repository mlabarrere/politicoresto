import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_SECTIONS,
  resolveAccountSection,
} from '@/lib/account/sections';

describe('aCCOUNT_SECTIONS', () => {
  it('contains profile, votes, drafts, posts, comments, security', () => {
    const keys = ACCOUNT_SECTIONS.map((s) => s.key);
    expect(keys).toContain('profile');
    expect(keys).toContain('votes');
    expect(keys).toContain('drafts');
    expect(keys).toContain('posts');
    expect(keys).toContain('comments');
    expect(keys).toContain('security');
  });

  it('each section has label and description', () => {
    for (const section of ACCOUNT_SECTIONS) {
      expect(typeof section.label).toBe('string');
      expect(typeof section.description).toBe('string');
    }
  });
});

describe('resolveAccountSection', () => {
  it('returns matching section key', () => {
    expect(resolveAccountSection('votes')).toBe('votes');
    expect(resolveAccountSection('drafts')).toBe('drafts');
    expect(resolveAccountSection('posts')).toBe('posts');
    expect(resolveAccountSection('comments')).toBe('comments');
    expect(resolveAccountSection('security')).toBe('security');
  });

  it('returns profile as fallback for unknown key', () => {
    expect(resolveAccountSection('unknown')).toBe('profile');
  });

  it('returns profile as fallback for null', () => {
    expect(resolveAccountSection(null)).toBe('profile');
  });

  it('returns profile as fallback for undefined', () => {
    expect(resolveAccountSection(undefined)).toBe('profile');
  });

  it('returns profile as fallback for empty string', () => {
    expect(resolveAccountSection('')).toBe('profile');
  });
});

import { describe, expect, it } from 'vitest';
import { normalizeUsername, validateUsername } from '@/lib/account/username';

describe('username helpers', () => {
  it('normalizes casing and spaces', () => {
    expect(normalizeUsername('  Mon_User  ')).toBe('mon_user');
  });

  it('rejects invalid syntax', () => {
    expect(validateUsername('ab')).toBeTruthy();
    expect(validateUsername('Name-With-Dash')).toBeTruthy();
    expect(validateUsername('nom espace')).toBeTruthy();
  });

  it('rejects reserved usernames', () => {
    expect(validateUsername('admin')).toContain('reserve');
  });

  it('accepts valid usernames', () => {
    expect(validateUsername('citoyen_2026')).toBeNull();
  });
});

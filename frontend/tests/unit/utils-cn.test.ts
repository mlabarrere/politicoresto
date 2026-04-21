import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('joins two class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores false values', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });

  it('ignores null values', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar');
  });

  it('ignores undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('returns empty string when all falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('returns single class unchanged', () => {
    expect(cn('only')).toBe('only');
  });

  it('handles no arguments', () => {
    expect(cn()).toBe('');
  });
});

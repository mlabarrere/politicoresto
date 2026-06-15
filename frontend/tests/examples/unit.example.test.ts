/**
 * Reference pattern: UNIT test.
 *
 * A unit test exercises a pure function or small piece of logic in
 * isolation. No I/O, no network, no database, no DOM. It runs in
 * milliseconds. If you find yourself mocking more than one thing, you
 * are probably writing an integration or component test — move it.
 *
 * Rule: "Do not mock the thing you are testing." The function under
 * test is imported and called directly with real inputs.
 */
import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() — className merge utility [reference unit example]', () => {
  it('concatenates truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b');
  });

  it('resolves conflicting Tailwind classes (tailwind-merge: last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

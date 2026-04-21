import { describe, expect, it } from 'vitest';

import { normalizeMultilineText } from '@/lib/utils/multiline';

describe('normalizeMultilineText', () => {
  it('returns empty string for null', () => {
    expect(normalizeMultilineText(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeMultilineText(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(normalizeMultilineText('')).toBe('');
  });

  it('normalizes \\r\\n to \\n', () => {
    expect(normalizeMultilineText('line1\r\nline2')).toBe('line1\nline2');
  });

  it('normalizes \\r to \\n', () => {
    expect(normalizeMultilineText('line1\rline2')).toBe('line1\nline2');
  });

  it('leaves already-normalized text unchanged', () => {
    expect(normalizeMultilineText('line1\nline2')).toBe('line1\nline2');
  });

  it('handles escaped \\n sequences in string', () => {
    expect(normalizeMultilineText('line1\\nline2')).toBe('line1\nline2');
  });

  it('handles plain text without newlines', () => {
    expect(normalizeMultilineText('Hello world')).toBe('Hello world');
  });
});

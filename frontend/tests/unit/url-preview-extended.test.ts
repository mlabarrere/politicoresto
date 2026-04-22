import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  normalizeSourceUrl,
  extractUrlPreviewFromHtml,
  fetchUrlPreview,
} from '@/lib/utils/url-preview';

describe('normalizeSourceUrl', () => {
  it('returns null for null input', () => {
    expect(normalizeSourceUrl(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeSourceUrl('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeSourceUrl('   ')).toBeNull();
  });

  it('normalizes https URL', () => {
    expect(normalizeSourceUrl('https://example.com')).toBe(
      'https://example.com/',
    );
  });

  it('normalizes http URL', () => {
    expect(normalizeSourceUrl('http://example.com')).toBe(
      'http://example.com/',
    );
  });

  it('adds https when no protocol given', () => {
    expect(normalizeSourceUrl('example.com')).toBe('https://example.com/');
  });

  it('returns null for non-http protocols', () => {
    expect(normalizeSourceUrl('ftp://example.com')).toBeNull();
  });

  it('returns null for unparseable URL', () => {
    expect(normalizeSourceUrl('not a url')).toBeNull();
  });
});

describe('extractUrlPreviewFromHtml', () => {
  it('extracts og:title', () => {
    const html = `<meta property="og:title" content="Mon titre OG">`;
    const result = extractUrlPreviewFromHtml(html, 'https://example.com');
    expect(result.title).toBe('Mon titre OG');
  });

  it('falls back to twitter:title', () => {
    const html = `<meta name="twitter:title" content="Titre Twitter">`;
    const result = extractUrlPreviewFromHtml(html, 'https://example.com');
    expect(result.title).toBe('Titre Twitter');
  });

  it('falls back to <title> tag', () => {
    const html = `<title>Titre HTML</title>`;
    const result = extractUrlPreviewFromHtml(html, 'https://example.com');
    expect(result.title).toBe('Titre HTML');
  });

  it('extracts og:description', () => {
    const html = `<meta property="og:description" content="Ma description">`;
    const result = extractUrlPreviewFromHtml(html, 'https://example.com');
    expect(result.description).toBe('Ma description');
  });

  it('extracts og:image', () => {
    const html = `<meta property="og:image" content="https://example.com/image.jpg">`;
    const result = extractUrlPreviewFromHtml(html, 'https://example.com');
    expect(result.image).toBe('https://example.com/image.jpg');
  });

  it('extracts og:site_name', () => {
    const html = `<meta property="og:site_name" content="Le Monde">`;
    const result = extractUrlPreviewFromHtml(html, 'https://example.com');
    expect(result.siteName).toBe('Le Monde');
  });

  it('returns url in result', () => {
    const result = extractUrlPreviewFromHtml('', 'https://example.com');
    expect(result.url).toBe('https://example.com');
  });

  it('returns undefined for missing fields', () => {
    const result = extractUrlPreviewFromHtml(
      '<html></html>',
      'https://example.com',
    );
    expect(result.title).toBeUndefined();
    expect(result.description).toBeUndefined();
  });
});

describe('fetchUrlPreview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when fetch returns non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await fetchUrlPreview('https://example.com');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error')),
    );
    const result = await fetchUrlPreview('https://example.com');
    expect(result).toBeNull();
  });

  it('parses preview from response HTML', async () => {
    const html = `<title>Preview Title</title>`;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => html,
      }),
    );
    const result = await fetchUrlPreview('https://example.com');
    expect(result?.title).toBe('Preview Title');
    expect(result?.url).toBe('https://example.com');
  });
});

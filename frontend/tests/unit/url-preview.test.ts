import { describe, expect, it } from 'vitest';
import {
  extractUrlPreviewFromHtml,
  normalizeSourceUrl,
} from '@/lib/utils/url-preview';

describe('url preview utilities', () => {
  it('extracts metadata from html', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Titre OG" />
          <meta property="og:description" content="Description OG" />
          <meta property="og:site_name" content="Site OG" />
        </head>
      </html>
    `;

    const preview = extractUrlPreviewFromHtml(html, 'https://example.com/page');

    expect(preview.title).toBe('Titre OG');
    expect(preview.description).toBe('Description OG');
    expect(preview.siteName).toBe('Site OG');
  });

  it('normalizes valid url input and rejects invalid protocols', () => {
    expect(normalizeSourceUrl('example.com')).toBe('https://example.com/');
    expect(normalizeSourceUrl('https://example.com/test')).toBe(
      'https://example.com/test',
    );
    expect(normalizeSourceUrl('ftp://example.com')).toBeNull();
    expect(normalizeSourceUrl('not a url')).toBeNull();
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

const bannedClassPatterns = [
  /\btext-muted\b(?!-foreground)/,
  /\btext-accent\b(?!-foreground)/,
  /\btext-ink\b/,
  /\bbg-panel\b/,
  /\bbg-paper\b/,
  /\bborder-line\b/,
  /\btext-info\b/,
  /\btext-warning\b/,
  /\bsoft-panel\b/,
  /\bsoft-section\b/,
];

const sourceFiles = [
  'app/page.tsx',
  'app/auth/login/page.tsx',
  'app/(public)/post/[slug]/page.tsx',
  'app/(authenticated)/me/page.tsx',
  'app/(authenticated)/me/settings/page.tsx',
  'components/layout/app-shell.tsx',
  'components/layout/app-header.tsx',
  'components/layout/site-footer.tsx',
  'components/layout/section-card.tsx',
  'components/layout/empty-state.tsx',
  'components/layout/screen-state.tsx',
  'app/not-found.tsx',
  'components/domain/post-card.tsx',
  'components/navigation/main-nav.tsx',
];

describe('uI standards', () => {
  it('does not use deprecated visual aliases in app-facing components', () => {
    for (const file of sourceFiles) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');

      for (const pattern of bannedClassPatterns) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it('does not lock page scrolling at the shell level', () => {
    const source = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

    expect(source).not.toContain('@apply relative overflow-hidden;');
    expect(source).not.toContain('.page-shell::before');
  });

  it('keeps app and pages on wrappers instead of legacy ui primitives', () => {
    const allSource = fs
      .readdirSync(path.join(root, 'components'), { recursive: true })
      .filter((entry) => typeof entry === 'string' && entry.endsWith('.tsx'))
      .map((entry) => path.join(root, 'components', entry as string))
      .concat(
        fs
          .readdirSync(path.join(root, 'app'), { recursive: true })
          .filter(
            (entry) => typeof entry === 'string' && entry.endsWith('.tsx'),
          )
          .map((entry) => path.join(root, 'app', entry as string)),
      );

    for (const file of allSource) {
      const normalized = file.replaceAll('\\', '/');
      if (normalized.includes('/components/ui/')) continue;
      if (normalized.includes('/components/app/')) continue;
      if (normalized.includes('/tests/')) continue;
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toContain('@/components/ui/button');
      expect(source).not.toContain('@/components/ui/input');
      expect(source).not.toContain('@/components/ui/textarea');
      expect(source).not.toContain('@/components/ui/select');
      expect(source).not.toContain('@/components/ui/card');
      expect(source).not.toContain('@/components/ui/tabs');
      expect(source).not.toContain('@/components/ui/sheet');
      expect(source).not.toContain('@/components/ui/avatar');
      expect(source).not.toContain('@/components/ui/dropdown-menu');
      expect(source).not.toContain('@/components/ui/skeleton');
      expect(source).not.toContain('@/components/catalyst/');
      expect(source).not.toContain('className="app-card');
      expect(source).not.toContain('className="eyebrow');
      expect(source).not.toContain('className="editorial-title');
    }
  });
});

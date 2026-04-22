import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

describe('prod stability guardrails', () => {
  it('does not leak technical feed errors on public pages', () => {
    const homeSource = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');

    expect(homeSource).not.toContain('Feed partiel');
    expect(homeSource).not.toContain('Lecture incomplete');
  });

  it('forces create CTA to dedicated page and removes drawer flow provider', () => {
    const ctaSource = fs.readFileSync(
      path.join(root, 'components/app/app-primary-cta.tsx'),
      'utf8',
    );

    expect(ctaSource).toContain("router.push('/post/new')");
    expect(ctaSource).not.toContain('openCreate');
    expect(
      fs.existsSync(
        path.join(root, 'components/layout/create-flow-provider.tsx'),
      ),
    ).toBe(false);
  });
});

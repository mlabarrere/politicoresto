import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

describe('rSC boundaries', () => {
  it('keeps the home page on server-safe imports', () => {
    const source = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');

    expect(source).toContain('createServerSupabaseClient');
    expect(source).toContain('HomePageShell');
    expect(source).not.toContain('@/components/ui/button');
    expect(source).not.toContain('createBrowserSupabaseClient');
  });
});

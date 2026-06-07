import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * On-demand forum seed (`npm run seed:forum`). Runs in Node against the REAL
 * local Supabase stack and populates PERSISTENT demo data — it is deliberately
 * kept out of the unit and integration globs so CI never runs it. See
 * tests/seed/forum-seed.ts.
 */
// eslint-disable-next-line import/no-default-export -- Vitest convention
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/seed/**/*.ts'],
    fileParallelism: false,
    testTimeout: 180_000,
    hookTimeout: 60_000,
  },
});

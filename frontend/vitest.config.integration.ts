import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Integration tests run in Node against the REAL local Supabase stack
 * (Postgres + Auth + Storage brought up by `supabase start`).
 *
 * Rules for this layer:
 *   - No mocks of the system under test (no `vi.mock` of Supabase client
 *     or of the code path being exercised).
 *   - Each test resets/cleans its own state through helpers in
 *     tests/fixtures/supabase.ts (admin client, not the app's SSR factories).
 *   - Tests live under tests/integration/ and use the .int.test.ts suffix
 *     so the unit-test runner ignores them (and vice-versa).
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
    include: ['tests/integration/**/*.int.test.ts'],
    setupFiles: ['./tests/integration/setup-env.ts'],
    // Integration tests touch a shared local DB — serialize to avoid
    // cross-test interference until we add per-test schema/txn isolation.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});

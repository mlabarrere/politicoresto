import { defineConfig, devices } from '@playwright/test';

const RESET_NEXT_BUILD_COMMAND =
  process.platform === 'win32'
    ? 'powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }"'
    : 'rm -rf .next';

const STAGING_BASE_URL = process.env.E2E_BASE_URL;
const hasStagingCreds = Boolean(
  STAGING_BASE_URL &&
  process.env.E2E_SUPABASE_URL &&
  process.env.E2E_SUPABASE_PUBLISHABLE_KEY &&
  process.env.E2E_TEST_USER_EMAIL &&
  process.env.E2E_TEST_USER_PASSWORD,
);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
  },
  // Les runs staging (contre une URL publique) n'ont pas besoin de webServer local.
  webServer: hasStagingCreds
    ? undefined
    : {
        command: `${RESET_NEXT_BUILD_COMMAND} && npm run dev -- --hostname 127.0.0.1 --port 3001`,
        url: 'http://127.0.0.1:3001',
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'desktop',
      testIgnore: ['**/auth-staging.spec.ts'],
      use: {
        browserName: 'chromium',
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile',
      testIgnore: ['**/auth-staging.spec.ts'],
      use: {
        browserName: 'chromium',
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'staging-auth',
      testMatch: ['**/auth-staging.spec.ts'],
      use: {
        browserName: 'chromium',
        baseURL: STAGING_BASE_URL ?? 'http://127.0.0.1:3001',
        ...devices['Desktop Chrome'],
      },
    },
  ],
});

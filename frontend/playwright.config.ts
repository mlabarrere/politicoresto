import { execSync } from 'node:child_process';
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

/**
 * Resolve local Supabase env at config-load time so we can inject it
 * into the Next.js webServer process. Playwright spawns the webServer
 * BEFORE globalSetup runs — setting process.env there is too late for
 * the Next dev server. Running it here also means the config refuses
 * to start if the local stack is down, with a clear actionable error.
 */
function resolveLocalSupabaseEnv(): {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  SERVICE_ROLE_KEY: string;
} {
  let raw: string;
  try {
    raw = execSync('supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new Error(
      `E2E config: \`supabase status -o env\` failed. Run \`supabase start\` first. Underlying: ${(err as Error).message}`,
    );
  }

  const env = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const m = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
    if (m?.[1] !== undefined && m[2] !== undefined) env.set(m[1], m[2]);
  }
  const apiUrl = env.get('API_URL');
  const publishableKey = env.get('PUBLISHABLE_KEY') ?? env.get('ANON_KEY');
  const serviceRoleKey = env.get('SECRET_KEY') ?? env.get('SERVICE_ROLE_KEY');
  if (!apiUrl || !publishableKey || !serviceRoleKey) {
    throw new Error(
      'E2E config: could not parse API_URL / PUBLISHABLE_KEY / SERVICE_ROLE_KEY from `supabase status -o env`. Run `supabase start` first.',
    );
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? publishableKey,
    SERVICE_ROLE_KEY: serviceRoleKey,
  };
}

const localSupabaseEnv = hasStagingCreds ? null : resolveLocalSupabaseEnv();
// Expose public vars AND the service-role key to the Playwright runner
// process (not to the webServer — service-role must never reach Next.js
// client/server bundles). The E2E auth helper reads E2E_SUPABASE_SERVICE_ROLE_KEY
// to mint magic-link tokens for the seed user — no password is ever used.
if (localSupabaseEnv) {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??=
    localSupabaseEnv.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??=
    localSupabaseEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ??=
    localSupabaseEnv.SERVICE_ROLE_KEY;
}

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  // Serialize across spec files: we share a single local Supabase DB
  // and the seed user's state (posts, comments, reactions) is mutated
  // by multiple specs. Running files in parallel produces races where
  // one suite's beforeEach clears another suite's fixtures. The unit
  // cost (slower total wall-clock) is acceptable vs. flaky CI.
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
  },
  // Les runs staging (contre une URL publique) n'ont pas besoin de webServer local.
  //
  // For local runs: `next build && next start` by default. Turbopack
  // `next dev` is convenient for iteration but occasionally drops
  // connections mid-test under sustained load (ERR_CONNECTION_RESET),
  // which surfaces as a 1-in-10 flake across long E2E runs. The built
  // server has no HMR, zero recompiles, and responds at production
  // latencies — the same path CI exercises. Set E2E_USE_DEV=1 to opt
  // back into dev mode for local iteration.
  webServer: hasStagingCreds
    ? undefined
    : {
        command: process.env.E2E_USE_DEV
          ? `${RESET_NEXT_BUILD_COMMAND} && npm run dev -- --hostname 127.0.0.1 --port 3001`
          : `${RESET_NEXT_BUILD_COMMAND} && npm run build && npm run start -- --hostname 127.0.0.1 --port 3001`,
        url: 'http://127.0.0.1:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: localSupabaseEnv!.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            localSupabaseEnv!.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3001',
          // `next build` fails without SKIP_ENV_VALIDATION unless the
          // real env is populated — Supabase env above IS populated,
          // but t3-env still checks a few things it shouldn't for E2E.
          SKIP_ENV_VALIDATION: 'true',
          // MCP surface is OFF by default (lot 0); E2E suite covers its
          // security tests, so we opt-in inside the test webServer.
          MCP_ENABLED: 'true',
        },
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

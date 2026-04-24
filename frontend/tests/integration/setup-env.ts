/**
 * Integration-test setup — populate the same `NEXT_PUBLIC_SUPABASE_*`
 * env vars the app reads at module load, sourced from the local
 * `supabase status` CLI. This runs before any module under test
 * imports `lib/supabase/env.ts`, so `@t3-oss/env-nextjs` picks up real
 * values instead of undefined.
 */
import { execSync } from 'node:child_process';

function readFromCli() {
  const raw = execSync('supabase status -o env', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const env = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const m = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
    if (m?.[1] !== undefined && m[2] !== undefined) env.set(m[1], m[2]);
  }
  return env;
}

const env = readFromCli();

const apiUrl = env.get('API_URL');
const publishableKey = env.get('PUBLISHABLE_KEY') ?? env.get('ANON_KEY');

if (!apiUrl || !publishableKey) {
  throw new Error(
    'Integration setup: supabase CLI did not return API_URL / PUBLISHABLE_KEY. Run `supabase start` first.',
  );
}

process.env.NEXT_PUBLIC_SUPABASE_URL ??= apiUrl;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= publishableKey;
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000';

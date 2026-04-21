import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Typed, validated env access. Built with @t3-oss/env-nextjs + zod.
 *
 * Browser-safe: this module is imported transitively by the browser client
 * factory. It must NOT pull server-only Node APIs (e.g. `@/lib/logger` which
 * uses `async_hooks`). @t3-oss/env-nextjs handles the client/server split
 * automatically — `client` keys are validated on both sides; `server` keys
 * would never appear in the browser bundle.
 */
const env = createEnv({
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  // In tests the env is absent; skip validation so unit tests don't need to
  // stub every var. SKIP_ENV_VALIDATION is the t3-env convention CI honours
  // during build — the production runtime on Vercel sets real values via
  // project env vars. In local dev / production runtime, validation is on.
  skipValidation:
    process.env.NODE_ENV === 'test' || Boolean(process.env.SKIP_ENV_VALIDATION),
});

export const supabaseEnv = {
  url: () => env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: () => env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

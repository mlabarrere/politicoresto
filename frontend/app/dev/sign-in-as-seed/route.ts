/**
 * Development-only signin shortcut.
 *
 * Logs the seed user (`test@example.com`) into the current browser
 * session by reproducing the exact flow `tests/e2e/helpers/auth.ts`
 * uses for E2E specs : service-role mints a magic link, the SSR
 * client redeems the token, the resulting `sb-*` cookies are written
 * onto the response.
 *
 * The route is gated three ways and **never** reaches production:
 *   1. `NODE_ENV !== 'production'` — Next inlines this at build time
 *      so the file produces a 404 stub in prod bundles.
 *   2. Requires `DEV_AUTH_BYPASS=true` env var.
 *   3. Requires `SUPABASE_SERVICE_ROLE_KEY` (or the local CLI `SECRET_KEY`)
 *      — present locally, absent in Vercel Preview / Production.
 *
 * If any check fails we return a clean 404 — no error message that
 * would advertise the route's existence.
 */
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createLogger } from '@/lib/logger';

const log = createLogger('dev.sign-in');

const SEED_EMAIL = 'test@example.com';

export async function GET(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }
  if (process.env.DEV_AUTH_BYPASS !== 'true') {
    return new NextResponse(null, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SECRET_KEY;
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/';

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: SEED_EMAIL,
    });
  if (linkError || !linkData.properties?.hashed_token) {
    log.error(
      {
        event: 'dev.sign-in.generate_link_failed',
        message: linkError?.message,
      },
      'magic link generation failed',
    );
    return new NextResponse('Magic link failed', { status: 500 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, request.url));

  const ssr = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () =>
        cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyError) {
    log.error(
      {
        event: 'dev.sign-in.verify_otp_failed',
        message: verifyError.message,
      },
      'verify otp failed',
    );
    return new NextResponse('Verify OTP failed', { status: 500 });
  }

  log.info(
    { event: 'dev.sign-in.ok', next, email: SEED_EMAIL },
    'dev seed sign-in succeeded',
  );
  return response;
}

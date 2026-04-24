/**
 * Handle the Approve / Deny click from `app/oauth/consent/page.tsx`.
 *
 * We call `supabase.auth.oauth.{approve,deny}Authorization()` with
 * `skipBrowserRedirect: true` so we get the redirect URL back as data
 * and can issue a 303 ourselves — this keeps the flow SSR-only (no
 * client-side JS needed, no trust boundary outside the server).
 *
 * **CSRF protection.** This endpoint mutates user state (grants an OAuth
 * client access). A drive-by POST from `evil.com` while the user is
 * logged in must be impossible. We enforce same-origin via the `Origin`
 * (or `Referer`) header — both are set by the browser on form POSTs and
 * cannot be forged by the page that submits the form. A request without
 * either header, or with a header pointing to a foreign origin, is
 * rejected with 403 before any decision is recorded.
 */
import { NextResponse } from 'next/server';
import { createLogger, logError, withRequest } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const baseLog = createLogger('api.oauth.decision');

function targetOriginFor(request: Request): string {
  // Trust the Host header the request actually arrived with (set by the
  // client / forwarded by Vercel). `new URL(request.url).origin` would
  // sometimes carry a placeholder host on Vercel edge / Next runtime.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost ?? request.headers.get('host');
  if (host) {
    const proto =
      forwardedProto ??
      (host.startsWith('localhost') || host.startsWith('127.')
        ? 'http'
        : 'https');
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

function assertSameOrigin(request: Request): { ok: boolean; reason?: string } {
  const targetOrigin = targetOriginFor(request);
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Origin header is the strong signal. If present, it MUST match.
  if (origin) {
    if (origin === targetOrigin) return { ok: true };
    return {
      ok: false,
      reason: `origin_mismatch:${origin}_vs_${targetOrigin}`,
    };
  }

  // Some browsers (older Firefox, file://) omit Origin on same-site form
  // POSTs but always send Referer. Use Referer as a fallback.
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin === targetOrigin) return { ok: true };
      return {
        ok: false,
        reason: `referer_mismatch:${refererOrigin}_vs_${targetOrigin}`,
      };
    } catch {
      return { ok: false, reason: 'referer_unparseable' };
    }
  }

  return { ok: false, reason: 'origin_and_referer_missing' };
}

export async function POST(request: Request) {
  const log = withRequest(baseLog, request);

  const csrf = assertSameOrigin(request);
  if (!csrf.ok) {
    log.warn(
      { event: 'oauth.decision.csrf_blocked', reason: csrf.reason },
      'cross-origin decision blocked',
    );
    return NextResponse.json(
      { error: 'Cross-origin request rejected' },
      { status: 403 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const decision = String(form.get('decision') ?? '');
  const authorizationId = String(form.get('authorization_id') ?? '');

  if (!authorizationId || (decision !== 'approve' && decision !== 'deny')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const result =
      decision === 'approve'
        ? await supabase.auth.oauth.approveAuthorization(authorizationId, {
            skipBrowserRedirect: true,
          })
        : await supabase.auth.oauth.denyAuthorization(authorizationId, {
            skipBrowserRedirect: true,
          });

    if (result.error || !result.data?.redirect_url) {
      log.error(
        {
          event: `oauth.decision.${decision}.failed`,
          authorization_id: authorizationId,
          user_id: userId,
          message: result.error?.message,
        },
        'supabase oauth decision failed',
      );
      return NextResponse.json(
        { error: result.error?.message ?? 'Decision failed' },
        { status: 400 },
      );
    }

    log.info(
      {
        event: `oauth.decision.${decision}.ok`,
        authorization_id: authorizationId,
        user_id: userId,
      },
      'oauth decision recorded',
    );
    return NextResponse.redirect(result.data.redirect_url, { status: 303 });
  } catch (err) {
    logError(log, err, {
      event: 'oauth.decision.failed',
      authorization_id: authorizationId,
      user_id: userId,
    });
    return NextResponse.json({ error: 'Decision failed' }, { status: 400 });
  }
}

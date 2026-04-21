import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { createLogger, logError, withRequest } from "@/lib/logger";
import { supabaseEnv } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/utils/safe-path";

const moduleLog = createLogger("auth.callback");

/**
 * Callback OAuth — pattern officiel @supabase/ssr pour Next.js Route Handlers.
 *
 * Crée une NextResponse de redirection en amont. Supabase écrit les cookies
 * de session directement sur CET objet response via setAll. Tous les chemins
 * de sortie retournent la MÊME response (ou une clone qui copie les cookies),
 * garantissant que le Set-Cookie arrive bien au browser.
 *
 * Raison : `cookies()` de `next/headers` + `cookieStore.set()` n'est PAS
 * toujours propagé aux `NextResponse.redirect()` personnalisées — bug connu
 * qui a causé la 6e régression SSO.
 */
export async function GET(request: NextRequest) {
  const log = withRequest(moduleLog, request);
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  log.info(
    { event: "auth.oauth.callback.received", has_code: Boolean(code), next },
    "oauth callback received"
  );

  if (!code) {
    log.warn(
      { event: "auth.oauth.callback.missing_code", query: requestUrl.search },
      "missing OAuth code"
    );
    const errUrl = new URL("/auth/auth-code-error", request.url);
    errUrl.searchParams.set("reason", "oauth_missing_code");
    errUrl.searchParams.set("next", next);
    return NextResponse.redirect(errUrl);
  }

  // Response object créé en amont — les cookies posés via setAll y sont
  // attachés directement (pattern Supabase officiel).
  const response = NextResponse.redirect(new URL(next, request.url));
  const cookieNamesPosted: string[] = [];

  const supabase = createServerClient(
    supabaseEnv.url(),
    supabaseEnv.publishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
            cookieNamesPosted.push(name);
          }
        }
      }
    }
  );

  log.debug({ event: "auth.oauth.exchange.start" }, "exchanging code for session");

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    logError(log, exchangeError, {
      event: "auth.oauth.exchange.failed",
      status: exchangeError.status,
      code: (exchangeError as { code?: string }).code,
      message: "exchange code for session failed"
    });
    const errUrl = new URL("/auth/auth-code-error", request.url);
    errUrl.searchParams.set("reason", "oauth_exchange_failed");
    errUrl.searchParams.set("next", next);
    return NextResponse.redirect(errUrl);
  }

  log.info(
    { event: "auth.oauth.exchange.ok", cookie_names: cookieNamesPosted },
    "session exchanged"
  );

  // Lire le user pour router vers /onboarding si username manque. Important :
  // on utilise la MÊME response — si on doit rediriger ailleurs que vers `next`,
  // on CLONE les cookies sur la nouvelle response.
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    log.warn(
      { event: "auth.oauth.callback.no_user_after_exchange" },
      "getUser returned no user after successful exchange"
    );
    return response;
  }

  const { data: profile, error: profileError } = await supabase
    .from("app_profile")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    log.warn(
      {
        event: "auth.profile.fetch_failed_nonblocking",
        user_id: user.id,
        code: profileError.code,
        db_message: profileError.message
      },
      "profile fetch failed (non-blocking)"
    );
  }

  if (!profile?.username) {
    const onboardingUrl = new URL("/onboarding", request.url);
    if (next !== "/") onboardingUrl.searchParams.set("next", next);
    log.info(
      { event: "auth.onboarding.redirect", user_id: user.id, next },
      "no username — redirecting to onboarding"
    );
    // Clone la response vers /onboarding en copiant les cookies de session.
    const onboardingResponse = NextResponse.redirect(onboardingUrl);
    for (const c of response.cookies.getAll()) {
      onboardingResponse.cookies.set(c);
    }
    return onboardingResponse;
  }

  log.info(
    { event: "auth.callback.redirect_next", user_id: user.id, next, username: profile.username },
    "redirecting to next"
  );
  return response;
}

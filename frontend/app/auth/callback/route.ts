import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { supabaseEnv } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/utils/safe-path";

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
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const host = request.headers.get("host");

  console.info("[auth/callback] GET", {
    host,
    origin: requestUrl.origin,
    pathname: requestUrl.pathname,
    hasCode: Boolean(code),
    next
  });

  if (!code) {
    console.warn("[auth/callback] missing OAuth code — redirecting to login", {
      host,
      fullQuery: requestUrl.search
    });
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("auth_error", "oauth_missing_code");
    return NextResponse.redirect(loginUrl);
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

  console.info("[auth/callback] exchanging code for session…", {
    host,
    cookieNamesBefore: request.cookies.getAll().map((c) => c.name)
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      host,
      message: exchangeError.message,
      status: exchangeError.status,
      code: (exchangeError as { code?: string }).code,
      name: exchangeError.name
    });
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("auth_error", "oauth_exchange_failed");
    return NextResponse.redirect(loginUrl);
  }

  console.info("[auth/callback] session exchanged OK", {
    host,
    cookieNamesPosted
  });

  // Lire le user pour router vers /onboarding si username manque. Important :
  // on utilise la MÊME response — si on doit rediriger ailleurs que vers `next`,
  // on CLONE les cookies sur la nouvelle response.
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("[auth/callback] getUser returned no user after successful exchange", { host });
    return response;
  }

  const { data: profile, error: profileError } = await supabase
    .from("app_profile")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.warn("[auth/callback] profile fetch failed (non-blocking)", {
      host,
      userId: user.id,
      message: profileError.message,
      code: profileError.code
    });
  }

  if (!profile?.username) {
    const onboardingUrl = new URL("/onboarding", request.url);
    if (next !== "/") onboardingUrl.searchParams.set("next", next);
    console.info("[auth/callback] no username — redirecting to onboarding", {
      host,
      userId: user.id
    });
    // Clone la response vers /onboarding en copiant les cookies de session.
    const onboardingResponse = NextResponse.redirect(onboardingUrl);
    for (const c of response.cookies.getAll()) {
      onboardingResponse.cookies.set(c);
    }
    return onboardingResponse;
  }

  console.info("[auth/callback] username exists — redirecting to next", {
    host,
    userId: user.id,
    next,
    username: profile.username
  });
  return response;
}

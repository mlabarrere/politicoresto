import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { createLogger, getRequestLogger, logError } from "@/lib/logger";
import { supabaseEnv } from "@/lib/supabase/env";

const moduleLog = createLogger("auth.middleware");

/**
 * Pattern officiel Supabase SSR pour Next.js middleware.
 *
 * L'appel à `supabase.auth.getClaims()` est **CRITIQUE** — c'est ce qui
 * déclenche le refresh du JWT expiré via le refresh_token cookie. Sans lui,
 * après ~1h d'inactivité l'utilisateur apparaît comme non-authentifié alors
 * que la session est encore valide (refresh_token non expiré).
 *
 * https://supabase.com/docs/guides/auth/server-side/nextjs (section middleware)
 *
 * `getClaims()` valide le JWT localement via JWKS (clés asymétriques, actives
 * sur ce projet depuis 2026-04-21). Si la signature locale échoue (token
 * expiré ou révoqué), Supabase SSR tombe sur `getUser()` en interne pour
 * revalider et trigger un refresh, puis réécrit les cookies via setAll.
 */
export async function updateSession(request: NextRequest) {
  const log = getRequestLogger() ?? moduleLog;
  let response = NextResponse.next({
    request: { headers: request.headers }
  });

  const supabase = createServerClient(
    supabaseEnv.url(),
    supabaseEnv.publishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
        ) {
          if (cookiesToSet.length > 0) {
            log.debug(
              {
                event: "auth.session.cookie_rotation",
                path: request.nextUrl.pathname,
                cookie_names: cookiesToSet.map((c) => c.name)
              },
              "cookie mutations (refresh)"
            );
          }
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set(name, value, options);
          }
        }
      }
    }
  );

  // Skip pour les server actions (POST Next-action) — la session est validée
  // côté RPC/RLS de toute façon, inutile d'ajouter un round-trip.
  const isServerAction = request.headers.get("next-action") !== null;
  if (isServerAction) {
    return response;
  }

  // Appel CRITIQUE : valide le JWT (JWKS local, fallback getUser) et trigger
  // le refresh si expiré. Se fait partout, pour toute navigation, sinon on
  // casse la session après expiration de l'access_token.
  const {
    data: { claims },
    error: claimsError
  } = await supabase.auth.getClaims();

  if (claimsError) {
    logError(log, claimsError, {
      event: "auth.session.getclaims_failed",
      path: request.nextUrl.pathname,
      level: "warn"
    });
  }

  // Gate d'auth : seul /me demande une session active, sinon on laisse passer
  // (le serveur fera sa propre gate si besoin via RLS ou requireSession).
  const pathname = request.nextUrl.pathname;
  const needsAuthGate =
    request.method === "GET" && pathname.startsWith("/me") && !claims?.sub;

  if (needsAuthGate) {
    log.info(
      { event: "auth.gate.redirect", path: pathname, reason: "unauthenticated_me" },
      "redirect to login"
    );
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Pattern officiel Supabase SSR pour Next.js middleware.
 *
 * L'appel à `supabase.auth.getUser()` est **CRITIQUE** — c'est ce qui
 * déclenche le refresh du JWT expiré via le refresh_token cookie. Sans lui,
 * après ~1h d'inactivité l'utilisateur apparaît comme non-authentifié alors
 * que la session est encore valide (refresh_token non expiré).
 *
 * https://supabase.com/docs/guides/auth/server-side/nextjs (section middleware)
 *
 * Le refresh est automatique et idempotent : si le JWT est encore valide,
 * aucun round-trip réseau. Si expiré, un POST à Supabase /auth/v1/token renvoie
 * un nouveau access_token + refresh_token, qui sont réécrits via setAll.
 */
export async function updateSession(request: NextRequest) {
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
            console.info("[proxy] cookie mutations (refresh)", {
              pathname: request.nextUrl.pathname,
              host: request.headers.get("host"),
              names: cookiesToSet.map((c) => c.name)
            });
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

  // Appel CRITIQUE : refresh du JWT si expiré. Se fait partout, pour toute
  // navigation, sinon on casse la session après expiration de l'access_token.
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    console.warn("[proxy] getUser failed", {
      message: userError.message,
      pathname: request.nextUrl.pathname
    });
  }

  // Gate d'auth : seul /me demande une session active, sinon on laisse passer
  // (le serveur fera sa propre gate si besoin via RLS ou requireSession).
  const pathname = request.nextUrl.pathname;
  const needsAuthGate =
    request.method === "GET" && pathname.startsWith("/me") && !user;

  if (needsAuthGate) {
    console.info("[proxy] unauthenticated /me → /auth/login", { pathname });
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

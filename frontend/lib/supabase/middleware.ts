import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Next.js middleware Supabase SSR.
 *
 * ### Pourquoi ce middleware existe
 *
 * Deux responsabilités :
 *
 * 1. **Refresh automatique du JWT** — `supabase.auth.getUser()` est appelé sur
 *    chaque navigation GET. Si le access_token est expiré, @supabase/ssr
 *    utilise le refresh_token stocké en cookie pour obtenir un nouveau token
 *    et le réécrit via setAll (→ response.cookies.set). Sans ce call, la
 *    session expire après ~1h d'inactivité même si le refresh_token est
 *    toujours valide.
 *
 * 2. **Gate des routes privées** — si accès GET /me sans session valide,
 *    redirige vers /auth/login?next=/me.
 *
 * Skip sur les Server Actions (header `next-action`) : la validation auth se
 * fait côté RPC `security definer` + RLS, inutile d'ajouter un round-trip.
 *
 * ### Pattern cookies
 *
 * `getAll()` lit depuis `request.cookies` (ce que le browser envoie).
 * `setAll(cookiesToSet)` écrit sur `response.cookies` — **c'est ce que le
 * browser recevra**. Si on utilise `cookies()` de `next/headers` à la place,
 * les mutations ne sont pas toujours propagées sur `NextResponse.redirect()`
 * (bug Next.js 16 déjà vu qui a causé 2 régressions SSO).
 *
 * Référence : https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers }
  });

  // Trace exhaustive des cookies reçus — permet de diagnostiquer les
  // régressions d'auth sans re-déployer du code debug (les 6 dernières
  // régressions SSO auraient toutes été diag en 2 min avec ces logs).
  const incoming = request.cookies.getAll();
  console.info("[proxy] incoming cookies", {
    pathname: request.nextUrl.pathname,
    host: request.headers.get("host"),
    method: request.method,
    count: incoming.length,
    names: incoming.map((c) => c.name),
    sbCookies: incoming
      .filter((c) => c.name.startsWith("sb-"))
      .map((c) => ({ name: c.name, len: c.value.length, head: c.value.slice(0, 20) }))
  });

  const supabase = createServerClient(
    supabaseEnv.url(),
    supabaseEnv.publishableKey(),
    {
      cookies: {
        getAll() {
          // Logué chaque fois que @supabase/ssr interroge les cookies.
          // Révèle quand le storage adapter ne trouve pas la session.
          const all = request.cookies.getAll();
          console.info("[proxy] supabase getAll()", {
            pathname: request.nextUrl.pathname,
            count: all.length,
            sbNames: all.filter((c) => c.name.startsWith("sb-")).map((c) => c.name)
          });
          return all;
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
        ) {
          // Log mutations = chaque fois que @supabase/ssr refresh le token.
          // Utile pour tracer les régressions silencieuses de session.
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

  // Server Actions : pas de refresh auth ici (la RPC le fait elle-même).
  const isServerAction = request.headers.get("next-action") !== null;
  if (isServerAction) {
    return response;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    // Logué pour tracer : "Auth session missing" = pas de cookie ou cookie
    // invalide. Les status/name/code permettent de diagnostiquer en un coup
    // d'œil depuis les logs Vercel.
    console.warn("[proxy] getUser failed", {
      message: userError.message,
      status: (userError as { status?: number }).status,
      name: userError.name,
      code: (userError as { code?: string }).code,
      pathname: request.nextUrl.pathname
    });
  }

  // Gate : /me (et sous-routes) exige une session active. Le reste est public.
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

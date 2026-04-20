import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
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
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  // Decider si on doit verifier la session cote Supabase (round-trip reseau ~200ms).
  // On ne le fait que pour les navigations GET vers /me et ses sous-routes — le
  // seul usage est de rediriger les visiteurs non-auth vers /auth/login.
  //
  // Les server actions (POST avec header next-action) authentifient elles-memes
  // via le RPC security definer ; pas besoin de refaire un getUser() ici, ce qui
  // ajoutait 200ms a chaque click dans la grille de vote.
  const isServerAction = request.headers.get("next-action") !== null;
  const pathname = request.nextUrl.pathname;
  const needsAuthGate =
    !isServerAction && request.method === "GET" && pathname.startsWith("/me");

  if (!needsAuthGate) {
    return response;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.warn("[proxy] getUser failed", {
      message: userError.message,
      pathname,
    });
  }

  if (!user) {
    console.info("[proxy] unauthenticated access to /me — redirecting to login", {
      pathname,
    });
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { supabaseEnv } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/utils/safe-path";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", next);

  if (!code) {
    loginUrl.searchParams.set("auth_error", "oauth_missing_code");
    return NextResponse.redirect(loginUrl);
  }

  // Capture cookies so we can apply them to whichever redirect we return
  const capturedCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

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
            capturedCookies.push({ name, value, options });
          });
        }
      }
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set("auth_error", "oauth_exchange_failed");
    return NextResponse.redirect(loginUrl);
  }

  // Helper: build a redirect response with session cookies applied
  function redirectWithSession(url: URL): NextResponse {
    const res = NextResponse.redirect(url);
    capturedCookies.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options);
    });
    return res;
  }

  // Check if the user already has a username; if not, send to onboarding
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("app_profile")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.username) {
      const onboardingUrl = new URL("/onboarding", request.url);
      if (next !== "/") onboardingUrl.searchParams.set("next", next);
      return redirectWithSession(onboardingUrl);
    }
  }

  return redirectWithSession(new URL(next, request.url));
}

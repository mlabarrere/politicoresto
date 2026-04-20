import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseEnv } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/utils/safe-path";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", next);

  console.info("[auth/callback] GET", {
    hasCode: !!code,
    next,
    origin: requestUrl.origin,
    pathname: requestUrl.pathname,
  });

  if (!code) {
    console.warn("[auth/callback] missing OAuth code — redirecting to login");
    loginUrl.searchParams.set("auth_error", "oauth_missing_code");
    return NextResponse.redirect(loginUrl);
  }

  // Use cookies() from next/headers so cookieStore.set() automatically
  // applies to any response returned — no async race condition.
  const cookieStore = await cookies();

  const supabase = createServerClient(
    supabaseEnv.url(),
    supabaseEnv.publishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  console.info("[auth/callback] exchanging code for session…", {
    cookieNames: cookieStore.getAll().map((c) => c.name),
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      message: error.message,
      status: error.status,
      code: (error as { code?: string }).code,
    });
    loginUrl.searchParams.set("auth_error", "oauth_exchange_failed");
    return NextResponse.redirect(loginUrl);
  }

  console.info("[auth/callback] session exchanged OK — fetching user…");

  // Check if the user already has a username; if not, send to onboarding
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    console.info("[auth/callback] user resolved", { userId: user.id });

    const { data: profile, error: profileError } = await supabase
      .from("app_profile")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("[auth/callback] profile fetch failed (non-blocking)", {
        message: profileError.message,
      });
    }

    if (!profile?.username) {
      const onboardingUrl = new URL("/onboarding", request.url);
      if (next !== "/") onboardingUrl.searchParams.set("next", next);
      console.info("[auth/callback] no username — redirecting to onboarding", {
        onboardingUrl: onboardingUrl.pathname,
      });
      return NextResponse.redirect(onboardingUrl);
    }

    console.info("[auth/callback] username exists — redirecting to next", {
      next,
      username: profile.username,
    });
  } else {
    console.warn("[auth/callback] getUser returned no user after successful exchange");
  }

  return NextResponse.redirect(new URL(next, request.url));
}

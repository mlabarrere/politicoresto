import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseEnv } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/utils/safe-path";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const host = request.headers.get("host");
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", next);

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
    loginUrl.searchParams.set("auth_error", "oauth_missing_code");
    return NextResponse.redirect(loginUrl);
  }

  // Use cookies() from next/headers so cookieStore.set() automatically
  // applies to any response returned — no async race condition.
  const cookieStore = await cookies();
  const cookieCountBefore = cookieStore.getAll().length;

  const supabase = createServerClient(
    supabaseEnv.url(),
    supabaseEnv.publishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        }
      }
    }
  );

  console.info("[auth/callback] exchanging code for session…", {
    host,
    cookieCountBefore,
    cookieNamesBefore: cookieStore.getAll().map((c) => c.name)
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  const cookieCountAfter = cookieStore.getAll().length;

  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      host,
      message: exchangeError.message,
      status: exchangeError.status,
      code: (exchangeError as { code?: string }).code,
      name: exchangeError.name,
      cookieCountBefore,
      cookieCountAfter
    });
    loginUrl.searchParams.set("auth_error", "oauth_exchange_failed");
    return NextResponse.redirect(loginUrl);
  }

  console.info("[auth/callback] session exchanged OK — fetching user…", {
    host,
    cookieCountBefore,
    cookieCountAfter,
    cookieDelta: cookieCountAfter - cookieCountBefore
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("[auth/callback] getUser returned no user after successful exchange", {
      host,
      cookieCountAfter
    });
    return NextResponse.redirect(new URL(next, request.url));
  }

  console.info("[auth/callback] user resolved", { host, userId: user.id });

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
      userId: user.id,
      onboardingUrl: onboardingUrl.pathname
    });
    return NextResponse.redirect(onboardingUrl);
  }

  console.info("[auth/callback] username exists — redirecting to next", {
    host,
    userId: user.id,
    next,
    username: profile.username
  });
  return NextResponse.redirect(new URL(next, request.url));
}

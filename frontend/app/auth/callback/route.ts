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
  let response = NextResponse.redirect(new URL(next, request.url));

  if (!code) {
    loginUrl.searchParams.set("auth_error", "oauth_missing_code");
    return NextResponse.redirect(loginUrl);
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set("auth_error", "oauth_exchange_failed");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

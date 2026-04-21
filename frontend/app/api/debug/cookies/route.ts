// DEBUG: endpoint temporaire pour diagnostiquer la persistance des cookies de session
// après un flow OAuth. À supprimer une fois le bug compris.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieNames = request.cookies.getAll().map((c) => ({
    name: c.name,
    length: c.value.length
  }));

  // Essaie de lire un user via getClaims — permet de voir si le JWT est valide.
  let authSnapshot: Record<string, unknown> = {};
  try {
    const supabase = createServerClient(
      supabaseEnv.url(),
      supabaseEnv.publishableKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(_: Array<{ name: string; value: string; options: CookieOptions }>) {
            // no-op for debug
          }
        }
      }
    );
    const claimsResult = await supabase.auth.getClaims();
    authSnapshot = {
      claimsSub: claimsResult.data?.claims?.sub ?? null,
      claimsError: claimsResult.error
        ? {
            message: claimsResult.error.message,
            status: claimsResult.error.status,
            name: claimsResult.error.name
          }
        : null
    };
  } catch (err) {
    authSnapshot = {
      exception: err instanceof Error ? { name: err.name, message: err.message } : String(err)
    };
  }

  return NextResponse.json({
    host: request.headers.get("host"),
    url: request.url,
    cookieCount: cookieNames.length,
    cookieNames,
    auth: authSnapshot
  });
}

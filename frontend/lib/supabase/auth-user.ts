import { cache } from "react";

import { createLogger } from "@/lib/logger";

/**
 * Récupère l'utilisateur courant via Supabase Auth.
 *
 * Pattern officiel Supabase pour Next.js SSR avec clés asymétriques :
 * `auth.getClaims()`. Validation JWT locale via JWKS, sans round-trip réseau
 * sur le happy path (token frais). Quand la signature locale échoue,
 * `getClaims()` tombe en interne sur `auth.getUser()` pour revalider, ce qui
 * est le comportement documenté et safe.
 *
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Prérequis projet (fait 2026-04-21) : clés JWT asymétriques activées
 * (ES256/RS256) côté Dashboard Supabase. Les anciennes clés HS256
 * symétriques sont désactivées — staging et prod partagent désormais le
 * même codebase auth (seules les variables d'env diffèrent).
 */
const log = createLogger("auth.user");

type JwtClaims = {
  sub?: string;
  email?: string | null;
  [key: string]: unknown;
};

type GetClaimsFn = () => Promise<{
  data?: { claims?: JwtClaims | null } | null;
  error?: unknown;
}>;

type AuthCapableClient = {
  auth?: { getClaims?: GetClaimsFn };
};

type AuthUser = { id: string; email: string | null };

/**
 * Memoized per-request. React's `cache()` keys by reference equality on the
 * arguments — `createServerSupabaseClient()` returns a fresh client per
 * request, so the cache is naturally scoped to the current request. Within a
 * single request, identical calls (same client instance) return the same
 * Promise, guaranteeing one `auth.getClaims()` call even if the middleware,
 * a layout, a page, and a data loader all ask.
 */
const resolveAuth = cache(async (client: AuthCapableClient): Promise<AuthUser | null> => {
  if (typeof client.auth?.getClaims !== "function") return null;
  try {
    // Call via the object so `this` binds — `auth.getClaims()` internally
    // calls `this.getSession()` / `this.getUser()` and crashes without it.
    const { data, error } = await client.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    log.debug({ event: "auth.user.resolved", user_id: claims.sub }, "user resolved");
    return { id: claims.sub, email: (claims.email as string | null | undefined) ?? null };
  } catch {
    return null;
  }
});

export async function getAuthUserId(client: AuthCapableClient): Promise<string | null> {
  return (await resolveAuth(client))?.id ?? null;
}

export async function getAuthUser(client: AuthCapableClient): Promise<AuthUser | null> {
  return resolveAuth(client);
}

/**
 * Récupère l'utilisateur courant via Supabase Auth.
 *
 * Utilise `auth.getUser()` — l'unique méthode qui fonctionne sur tous les projets
 * Supabase (legacy HS256 symétrique + nouveau asymétrique ES256/RS256).
 *
 * `auth.getClaims()` est plus rapide (validation JWT locale, 0 round-trip) MAIS
 * nécessite que le projet soit migré aux clés asymétriques. Sur staging/prod
 * actuels (HS256 legacy — pas de JWKS exposée), `getClaims()` retourne `null`
 * silencieusement ce qui casse toute l'auth.
 *
 * Le middleware Supabase SSR appelle déjà `getUser()` une fois par requête, donc
 * le second appel ici est souvent no-op (session en cache). Quand il y a un
 * round-trip réel, c'est ~200ms vers Supabase — prix à payer pour la robustesse.
 */
type GetUserFn = () => Promise<{
  data?: { user?: { id?: string; email?: string | null } | null };
  error?: unknown;
}>;

type AuthCapableClient = {
  auth?: { getUser?: GetUserFn };
};

type AuthUser = { id: string; email: string | null };

import { cache } from "react";

import { createLogger } from "@/lib/logger";

const log = createLogger("auth.user");

/**
 * Memoized per-request. React's `cache()` keys by reference equality on the
 * arguments — `createServerSupabaseClient()` returns a fresh client per
 * request, so the cache is naturally scoped to the current request. Within a
 * single request, identical calls (same client instance) return the same
 * Promise, guaranteeing one `auth.getUser()` round-trip even if the middleware,
 * a layout, a page, and a data loader all ask.
 */
const resolveAuth = cache(async (client: AuthCapableClient): Promise<AuthUser | null> => {
  const fn = client.auth?.getUser;
  if (typeof fn !== "function") return null;
  try {
    const { data, error } = await fn();
    if (error || !data?.user?.id) return null;
    log.debug({ event: "auth.user.resolved", user_id: data.user.id }, "user resolved");
    return { id: data.user.id, email: data.user.email ?? null };
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

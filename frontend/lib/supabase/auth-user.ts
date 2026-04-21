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
 * Note : on n'enrobe PAS dans `react.cache()`. La doc officielle appelle
 * `getClaims()` librement depuis chaque server component / action /
 * route handler. Avec les clés asymétriques (actives sur ce projet depuis
 * 2026-04-21), chaque appel valide le JWT localement — pas de coût réseau,
 * pas besoin de mémorisation artificielle qui introduirait une surface de
 * bugs liée au `this`-binding et à la clé de cache.
 */

interface JwtClaims {
  sub?: string;
  email?: string | null;
  [key: string]: unknown;
}

type GetClaimsFn = () => Promise<{
  data?: { claims?: JwtClaims | null } | null;
  error?: unknown;
}>;

interface AuthCapableClient {
  auth?: { getClaims?: GetClaimsFn };
}

interface AuthUser { id: string; email: string | null }

async function resolveAuth(
  client: AuthCapableClient,
): Promise<AuthUser | null> {
  if (typeof client.auth?.getClaims !== 'function') return null;
  try {
    // Call as a method so `this` binds — auth-js's getClaims() internally
    // calls `this.getSession()` / `this.getUser()` and crashes otherwise.
    const { data, error } = await client.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    return {
      id: claims.sub,
      email: (claims.email) ?? null,
    };
  } catch {
    return null;
  }
}

export async function getAuthUserId(
  client: AuthCapableClient,
): Promise<string | null> {
  return (await resolveAuth(client))?.id ?? null;
}

export async function getAuthUser(
  client: AuthCapableClient,
): Promise<AuthUser | null> {
  return resolveAuth(client);
}

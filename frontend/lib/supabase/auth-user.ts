/**
 * Récupère l'utilisateur courant **sans round-trip réseau**.
 *
 * `auth.getClaims()` valide le JWT localement (JWKS cachés). Zéro HTTP.
 *
 * On n'appelle **jamais** :
 * - `getUser()` : round-trip ~200ms superflu vu qu'on a RLS + RPC security definer
 * - `getSession()` : buggy avec @supabase/ssr en Server Components
 *   (`this.initializePromise` undefined → crash render SSR sur `/`)
 *
 * Pas de session → null. Le UI gère le cas anonyme.
 */
type AuthUser = { id: string; email: string | null };

type ClaimsFn = () => Promise<{
  data?: { claims?: { sub?: string; email?: string | null } | null } | null;
}>;

type AuthCapableClient = {
  auth?: { getClaims?: ClaimsFn };
};

async function resolveAuth(client: AuthCapableClient): Promise<AuthUser | null> {
  const fn = client.auth?.getClaims;
  if (typeof fn !== "function") return null;
  try {
    const { data } = await fn();
    const claims = data?.claims;
    return claims?.sub ? { id: claims.sub, email: claims.email ?? null } : null;
  } catch {
    return null;
  }
}

export async function getAuthUserId(client: AuthCapableClient): Promise<string | null> {
  return (await resolveAuth(client))?.id ?? null;
}

export async function getAuthUser(client: AuthCapableClient): Promise<AuthUser | null> {
  return resolveAuth(client);
}

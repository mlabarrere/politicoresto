/**
 * Récupère l'utilisateur courant **sans round-trip réseau** quand c'est possible.
 *
 * - `auth.getClaims()` valide le JWT localement (0 ms) à partir des JWKS mis en
 *   cache par @supabase/supabase-js (≥ 2.45). Chemin rapide.
 * - Fallback sur `getSession()` si `getClaims()` n'est pas dispo ou échoue
 *   (lecture cookie, 0 ms).
 * - On n'appelle **jamais** `getUser()` : round-trip HTTP superflu quand la
 *   source de vérité est la RLS + les RPC `security definer`.
 */
type AuthUser = { id: string; email: string | null };

type ClaimsFn = () => Promise<{
  data?: { claims?: { sub?: string; email?: string | null } | null } | null;
}>;

type SessionFn = () => Promise<{
  data?: {
    session?: { user?: { id?: string; email?: string | null } | null } | null;
  };
}>;

type AuthCapableClient = {
  auth?: { getClaims?: ClaimsFn; getSession?: SessionFn };
};

async function fromClaims(fn?: ClaimsFn): Promise<AuthUser | null> {
  if (typeof fn !== "function") return null;
  try {
    const { data } = await fn();
    const claims = data?.claims;
    return claims?.sub ? { id: claims.sub, email: claims.email ?? null } : null;
  } catch {
    return null;
  }
}

async function fromSession(fn?: SessionFn): Promise<AuthUser | null> {
  if (typeof fn !== "function") return null;
  const { data } = await fn();
  const user = data?.session?.user;
  return user?.id ? { id: user.id, email: user.email ?? null } : null;
}

async function resolveAuth(client: AuthCapableClient): Promise<AuthUser | null> {
  return (await fromClaims(client.auth?.getClaims)) ?? (await fromSession(client.auth?.getSession));
}

export async function getAuthUserId(client: AuthCapableClient): Promise<string | null> {
  return (await resolveAuth(client))?.id ?? null;
}

export async function getAuthUser(client: AuthCapableClient): Promise<AuthUser | null> {
  return resolveAuth(client);
}

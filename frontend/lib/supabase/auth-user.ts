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
type ClaimsResult = {
  data?: { claims?: { sub?: string; email?: string | null } | null } | null;
};

type SessionResult = {
  data?: {
    session?: { user?: { id?: string; email?: string | null } | null } | null;
  };
};

type AuthCapableClient = {
  auth?: {
    getClaims?: () => Promise<ClaimsResult>;
    getSession?: () => Promise<SessionResult>;
  };
};

async function resolveAuth(
  client: AuthCapableClient
): Promise<{ id: string; email: string | null } | null> {
  if (typeof client.auth?.getClaims === "function") {
    try {
      const result = await client.auth.getClaims();
      const sub = result?.data?.claims?.sub;
      if (typeof sub === "string" && sub.length > 0) {
        return { id: sub, email: result?.data?.claims?.email ?? null };
      }
    } catch {
      /* fallthrough to session */
    }
  }

  if (typeof client.auth?.getSession === "function") {
    const result = await client.auth.getSession();
    const user = result.data?.session?.user;
    if (user?.id) return { id: user.id, email: user.email ?? null };
  }

  return null;
}

export async function getAuthUserId(client: AuthCapableClient): Promise<string | null> {
  const user = await resolveAuth(client);
  return user?.id ?? null;
}

export async function getAuthUser(
  client: AuthCapableClient
): Promise<{ id: string; email: string | null } | null> {
  return resolveAuth(client);
}

/**
 * Récupère l'user id courant **sans round-trip réseau** quand c'est possible.
 *
 * - `auth.getClaims()` valide le JWT localement (0 ms) à partir des JWKS mis en
 *   cache par `@supabase/supabase-js` (≥ 2.45). C'est la méthode à privilégier.
 * - Si `getClaims()` n'est pas disponible (vieux client, mock de test) ou
 *   retourne null, on retombe sur `getSession()` — lecture de cookie, 0 ms.
 * - On n'appelle **jamais** `getUser()` : c'est un round-trip HTTP (~150–200 ms)
 *   que la source de vérité RLS + RPC `security definer` rend superflu.
 *
 * Les appelants qui ont besoin de l'email ou de la session complète peuvent
 * encore appeler `getSession()` eux-mêmes ; ce helper ne couvre que le cas
 * "quel est l'id de l'utilisateur" — qui est 90% de l'usage.
 */
type ClaimsResult = {
  data?: { claims?: { sub?: string; email?: string | null } | null } | null;
  error?: unknown;
};

type SessionResult = {
  data?: {
    session?: {
      user?: { id?: string; email?: string | null } | null;
    } | null;
  };
};

type AuthCapableClient = {
  auth?: {
    getClaims?: () => Promise<ClaimsResult>;
    getSession?: () => Promise<SessionResult>;
    getUser?: () => Promise<{ data: { user: { id: string; email?: string | null } | null } }>;
  };
};

export async function getAuthUserId(client: AuthCapableClient): Promise<string | null> {
  if (typeof client.auth?.getClaims === "function") {
    try {
      const result = await client.auth.getClaims();
      const sub = result?.data?.claims?.sub;
      if (typeof sub === "string" && sub.length > 0) return sub;
    } catch {
      // fallthrough to session
    }
  }

  if (typeof client.auth?.getSession === "function") {
    const result = await client.auth.getSession();
    const id = result.data?.session?.user?.id;
    if (typeof id === "string" && id.length > 0) return id;
  }

  return null;
}

/**
 * Variante qui retourne aussi l'email (utile pour `getAccountWorkspaceData`).
 * Toujours 0 round-trip via `getClaims()` si disponible.
 */
export async function getAuthUser(
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
      // fallthrough
    }
  }

  if (typeof client.auth?.getSession === "function") {
    const result = await client.auth.getSession();
    const user = result.data?.session?.user;
    if (user?.id) return { id: user.id, email: user.email ?? null };
  }

  return null;
}

// --- legacy helpers kept for compatibility with existing callers/tests ---

export async function getCurrentUser(
  client: AuthCapableClient
): Promise<{ id: string } | null> {
  const id = await getAuthUserId(client);
  return id ? { id } : null;
}

export async function resolveCurrentUserId(
  client: AuthCapableClient,
  currentUserId?: string | null
): Promise<string | null> {
  if (currentUserId !== undefined) return currentUserId;
  return getAuthUserId(client);
}

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

async function resolveAuth(client: AuthCapableClient): Promise<AuthUser | null> {
  const fn = client.auth?.getUser;
  if (typeof fn !== "function") return null;
  try {
    const { data, error } = await fn();
    if (error || !data?.user?.id) return null;
    return { id: data.user.id, email: data.user.email ?? null };
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

/**
 * Resolve the application role embedded in the user's JWT
 * (`app_metadata.app_role`). Mirrors the SQL helper `current_app_role()`
 * — both default to `'authenticated'` when the claim is absent.
 *
 * Used by Next.js server components / actions that need a moderator
 * gate before issuing a row fetch — the SQL `is_moderator()` is the
 * authoritative check (RLS still enforces it), this function just lets
 * us 404 early instead of leaking the existence of an admin route.
 */

interface ClientLike {
  auth?: {
    getClaims?: () => Promise<{
      data?: unknown;
      error?: unknown;
    }>;
  };
}

function readRole(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const claims = (data as { claims?: unknown }).claims;
  if (!claims || typeof claims !== 'object') return null;
  const meta = (claims as { app_metadata?: unknown }).app_metadata;
  if (!meta || typeof meta !== 'object') return null;
  const role = (meta as { app_role?: unknown }).app_role;
  return typeof role === 'string' && role.length > 0 ? role : null;
}

export async function getAuthRole(client: ClientLike): Promise<string> {
  if (typeof client.auth?.getClaims !== 'function') return 'authenticated';
  try {
    const result = await client.auth.getClaims();
    if ((result as { error?: unknown }).error) return 'authenticated';
    return readRole(result) ?? 'authenticated';
  } catch {
    return 'authenticated';
  }
}

export async function isModeratorClaim(client: ClientLike): Promise<boolean> {
  const role = await getAuthRole(client);
  return role === 'admin' || role === 'moderator';
}

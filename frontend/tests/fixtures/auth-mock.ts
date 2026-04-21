/**
 * Fabrique un mock `auth` compatible avec `getAuthUserId` / `getAuthUser`.
 *
 * `lib/supabase/auth-user.ts` utilise `auth.getClaims()` (pattern officiel
 * Supabase depuis la migration aux clés asymétriques 2026-04-21). On mock
 * donc uniquement getClaims.
 */
export function makeAuthMock(userId: string | null = "user-1") {
  return {
    getClaims: async () => ({
      data: { claims: userId ? { sub: userId } : null },
      error: null
    })
  };
}

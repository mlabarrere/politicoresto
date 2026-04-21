/**
 * Fabrique un mock `auth` compatible avec `getAuthUserId` / `getAuthUser`.
 *
 * Supabase SSR utilise `auth.getUser()` (seul appel qui marche sur HS256
 * legacy + asymétrique). On mock donc uniquement getUser.
 */
export function makeAuthMock(userId: string | null = "user-1") {
  return {
    getUser: async () => ({
      data: { user: userId ? { id: userId } : null },
      error: null
    })
  };
}

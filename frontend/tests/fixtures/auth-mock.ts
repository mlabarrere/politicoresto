/**
 * Fabrique un mock `auth` compatible avec `getAuthUserId` / `getAuthUser`
 * (getClaims prioritaire, fallback getSession). Tests route/action.
 */
export function makeAuthMock(userId: string | null = "user-1") {
  const sub = userId;
  return {
    getClaims: async () => ({
      data: { claims: sub ? { sub } : null }
    }),
    getSession: async () => ({
      data: { session: sub ? { user: { id: sub } } : null }
    })
  };
}

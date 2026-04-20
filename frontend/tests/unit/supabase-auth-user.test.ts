import { describe, expect, it } from "vitest";

import { getAuthUserId, getCurrentUser } from "@/lib/supabase/auth-user";

describe("getAuthUserId", () => {
  it("returns sub from getClaims() when available (fast path, no round-trip)", async () => {
    const client = {
      auth: {
        getClaims: async () => ({ data: { claims: { sub: "user-123" } } })
      }
    };
    expect(await getAuthUserId(client)).toBe("user-123");
  });

  it("falls back to getSession when getClaims returns no sub", async () => {
    const client = {
      auth: {
        getClaims: async () => ({ data: { claims: null } }),
        getSession: async () => ({ data: { session: { user: { id: "session-user-456" } } } })
      }
    };
    expect(await getAuthUserId(client)).toBe("session-user-456");
  });

  it("falls back to getSession when getClaims throws", async () => {
    const client = {
      auth: {
        getClaims: async () => {
          throw new Error("jwks unavailable");
        },
        getSession: async () => ({ data: { session: { user: { id: "session-user-789" } } } })
      }
    };
    expect(await getAuthUserId(client)).toBe("session-user-789");
  });

  it("uses getSession directly when getClaims is absent", async () => {
    const client = {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: "only-session" } } } })
      }
    };
    expect(await getAuthUserId(client)).toBe("only-session");
  });

  it("returns null when no session is available", async () => {
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null } })
      }
    };
    expect(await getAuthUserId(client)).toBeNull();
  });

  it("returns null when auth is absent", async () => {
    expect(await getAuthUserId({})).toBeNull();
  });
});

describe("getCurrentUser", () => {
  it("wraps getAuthUserId into a {id} object", async () => {
    const client = {
      auth: {
        getClaims: async () => ({ data: { claims: { sub: "user-xyz" } } })
      }
    };
    expect(await getCurrentUser(client)).toEqual({ id: "user-xyz" });
  });

  it("returns null when no user is available", async () => {
    expect(await getCurrentUser({})).toBeNull();
  });
});

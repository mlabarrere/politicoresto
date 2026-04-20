import { describe, expect, it } from "vitest";

import { getAuthUser, getAuthUserId } from "@/lib/supabase/auth-user";

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

describe("getAuthUser", () => {
  it("returns id + email from claims when present", async () => {
    const client = {
      auth: {
        getClaims: async () => ({
          data: { claims: { sub: "user-xyz", email: "u@example.com" } }
        })
      }
    };
    expect(await getAuthUser(client)).toEqual({ id: "user-xyz", email: "u@example.com" });
  });

  it("returns null email when claims has no email", async () => {
    const client = {
      auth: {
        getClaims: async () => ({ data: { claims: { sub: "uid-1" } } })
      }
    };
    expect(await getAuthUser(client)).toEqual({ id: "uid-1", email: null });
  });

  it("returns null when no user is available", async () => {
    expect(await getAuthUser({})).toBeNull();
  });
});

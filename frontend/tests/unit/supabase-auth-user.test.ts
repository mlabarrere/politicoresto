import { describe, expect, it } from "vitest";

import { getAuthUser, getAuthUserId } from "@/lib/supabase/auth-user";

describe("getAuthUserId", () => {
  it("returns sub from getClaims() when available", async () => {
    const client = {
      auth: {
        getClaims: async () => ({ data: { claims: { sub: "user-123" } } })
      }
    };
    expect(await getAuthUserId(client)).toBe("user-123");
  });

  it("returns null when getClaims returns no sub", async () => {
    const client = {
      auth: {
        getClaims: async () => ({ data: { claims: null } })
      }
    };
    expect(await getAuthUserId(client)).toBeNull();
  });

  it("returns null when getClaims throws", async () => {
    const client = {
      auth: {
        getClaims: async () => {
          throw new Error("jwks unavailable");
        }
      }
    };
    expect(await getAuthUserId(client)).toBeNull();
  });

  it("returns null when getClaims is absent", async () => {
    expect(await getAuthUserId({ auth: {} })).toBeNull();
  });

  it("returns null when auth is absent (no crash)", async () => {
    expect(await getAuthUserId({})).toBeNull();
  });
});

describe("getAuthUser", () => {
  it("returns id + email from claims", async () => {
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

  it("returns null when no auth", async () => {
    expect(await getAuthUser({})).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { getAuthUser, getAuthUserId } from "@/lib/supabase/auth-user";

describe("getAuthUserId", () => {
  it("returns user.id from getUser() when authenticated", async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: { id: "user-123" } }, error: null })
      }
    };
    expect(await getAuthUserId(client)).toBe("user-123");
  });

  it("returns null when getUser returns no user", async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null })
      }
    };
    expect(await getAuthUserId(client)).toBeNull();
  });

  it("returns null when getUser returns an error", async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: { message: "bad jwt" } })
      }
    };
    expect(await getAuthUserId(client)).toBeNull();
  });

  it("returns null when getUser throws", async () => {
    const client = {
      auth: {
        getUser: async () => {
          throw new Error("network");
        }
      }
    };
    expect(await getAuthUserId(client)).toBeNull();
  });

  it("returns null when getUser is absent", async () => {
    expect(await getAuthUserId({ auth: {} })).toBeNull();
  });

  it("returns null when auth is absent (no crash)", async () => {
    expect(await getAuthUserId({})).toBeNull();
  });
});

describe("getAuthUser", () => {
  it("returns id + email when authenticated", async () => {
    const client = {
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-xyz", email: "u@example.com" } },
          error: null
        })
      }
    };
    expect(await getAuthUser(client)).toEqual({ id: "user-xyz", email: "u@example.com" });
  });

  it("returns null email when user has no email", async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: { id: "uid-1" } }, error: null })
      }
    };
    expect(await getAuthUser(client)).toEqual({ id: "uid-1", email: null });
  });

  it("returns null when no auth", async () => {
    expect(await getAuthUser({})).toBeNull();
  });
});

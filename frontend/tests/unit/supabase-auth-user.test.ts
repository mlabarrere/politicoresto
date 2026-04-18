import { describe, expect, it } from "vitest";

import { getCurrentUser } from "@/lib/supabase/auth-user";

describe("getCurrentUser", () => {
  it("returns user from getUser() when available", async () => {
    const user = { id: "user-123" };
    const client = {
      auth: {
        getUser: async () => ({ data: { user } })
      }
    };
    const result = await getCurrentUser(client);
    expect(result).toEqual(user);
  });

  it("returns null when getUser returns null user", async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: null } })
      }
    };
    const result = await getCurrentUser(client);
    expect(result).toBeNull();
  });

  it("falls back to getSession when getUser is absent", async () => {
    const user = { id: "session-user-456" };
    const client = {
      auth: {
        getSession: async () => ({ data: { session: { user } } })
      }
    };
    const result = await getCurrentUser(client);
    expect(result).toEqual(user);
  });

  it("returns null when getSession returns null session", async () => {
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null } })
      }
    };
    const result = await getCurrentUser(client);
    expect(result).toBeNull();
  });

  it("returns null when auth has no getUser or getSession", async () => {
    const client = { auth: {} };
    const result = await getCurrentUser(client);
    expect(result).toBeNull();
  });

  it("returns null when auth is undefined", async () => {
    const client = {};
    const result = await getCurrentUser(client);
    expect(result).toBeNull();
  });

  it("returns null when getUser returns undefined data", async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: {} })
      }
    };
    const result = await getCurrentUser(client);
    expect(result).toBeNull();
  });
});

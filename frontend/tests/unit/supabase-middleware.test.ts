import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn()
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient
}));

vi.mock("@/lib/supabase/env", () => ({
  supabaseEnv: {
    url: () => "https://example.supabase.co",
    publishableKey: () => "anon-key"
  }
}));

import { updateSession } from "@/lib/supabase/middleware";

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`);
}

function makeClient(user: unknown = null) {
  return {
    auth: {
      getUser: mocks.getUser.mockResolvedValue({ data: { user } })
    }
  };
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      // invoke getAll/setAll so the branch is covered
      if (options?.cookies?.getAll) options.cookies.getAll();
      return makeClient(null);
    });
  });

  it("redirects unauthenticated requests to /me to login", async () => {
    const request = makeRequest("/me");
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/auth/login");
    expect(location).toContain("next=%2Fme");
  });

  it("allows authenticated requests to /me through", async () => {
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      if (options?.cookies?.getAll) options.cookies.getAll();
      return {
        auth: {
          getUser: mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
        }
      };
    });
    const request = makeRequest("/me");
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it("passes through public routes without redirect", async () => {
    const request = makeRequest("/");
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it("passes through /auth routes without redirect", async () => {
    const request = makeRequest("/auth/login");
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it("redirects unauthenticated /me/settings to login with correct next", async () => {
    const request = makeRequest("/me/settings");
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain(encodeURIComponent("/me/settings"));
  });
});

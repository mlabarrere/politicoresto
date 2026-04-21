import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  createServerClient: vi.fn(),
  cookieStore: {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  },
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

// Mock next/headers cookies() — used by the new cookie-safe implementation
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mocks.cookieStore),
}));

import { GET } from "@/app/auth/callback/route";

function makeRequest(url: string) {
  return new NextRequest(url);
}

function makeSupabaseClient(error: unknown = null, opts?: { setsCookie?: boolean }) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn(async (code: string) => {
        // Emule ce que fait @supabase/ssr sur un succès : pose le cookie auth
        // via le callback setAll qu'on lui a donné. C'est CE comportement qui a
        // régressé 5 fois — on le pin ici.
        if (!error && opts?.setsCookie !== false) {
          const config = mocks.createServerClient.mock.calls.at(-1)?.[2] as
            | { cookies?: { setAll?: (c: Array<{ name: string; value: string; options: unknown }>) => void } }
            | undefined;
          config?.cookies?.setAll?.([
            {
              name: "sb-example-auth-token",
              value: "session-payload",
              options: { path: "/", httpOnly: true, sameSite: "lax", secure: true }
            }
          ]);
        }
        return { error };
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } })
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { username: "existing-user" }, error: null }))
        }))
      }))
    }))
  };
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.cookieStore.getAll.mockReturnValue([]);
    mocks.cookieStore.set.mockReset();
    mocks.createServerClient.mockReturnValue(makeSupabaseClient(null));
  });

  it("redirects to login with oauth_missing_code when no code param", async () => {
    const request = makeRequest("http://localhost:3000/auth/callback");
    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/auth/login");
    expect(location).toContain("oauth_missing_code");
  });

  it("redirects to / (default) on successful code exchange with no next param", async () => {
    mocks.createServerClient.mockReturnValue(makeSupabaseClient(null));
    const request = makeRequest("http://localhost:3000/auth/callback?code=valid-code");
    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    // safeNextPath(null) falls back to "/"
    expect(location).toMatch(/https?:\/\/[^/]+(\/)?$/);
  });

  it("redirects to login with oauth_exchange_failed on error", async () => {
    mocks.createServerClient.mockReturnValue(makeSupabaseClient({ message: "exchange failed" }));
    const request = makeRequest("http://localhost:3000/auth/callback?code=bad-code");
    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("oauth_exchange_failed");
  });

  it("respects the next param when exchange succeeds", async () => {
    mocks.createServerClient.mockReturnValue(makeSupabaseClient(null));
    const request = makeRequest(
      "http://localhost:3000/auth/callback?code=abc&next=%2Fpost%2Fsome-slug"
    );
    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/post/some-slug");
  });

  it("ignores unsafe next params (open redirect protection)", async () => {
    mocks.createServerClient.mockReturnValue(makeSupabaseClient(null));
    const request = makeRequest(
      "http://localhost:3000/auth/callback?code=abc&next=https%3A%2F%2Fevil.com"
    );
    const response = await GET(request);
    // safeNextPath rejects external URLs, falls back to /me
    const location = response.headers.get("location") ?? "";
    expect(location).not.toContain("evil.com");
  });

  // --- Anti-régression bug "login SSO → home non-logué" ---
  // Le symptôme : le cookie de session n'arrive jamais sur le navigateur.
  // Ces tests pinent le comportement attendu : exchangeCodeForSession
  // DOIT appeler cookieStore.set via le setAll callback, sinon pas de session.

  it("persists session cookies when exchange succeeds (anti-regression)", async () => {
    mocks.createServerClient.mockReturnValue(makeSupabaseClient(null));
    const request = makeRequest("http://localhost:3000/auth/callback?code=abc&next=/");
    await GET(request);
    expect(mocks.cookieStore.set).toHaveBeenCalled();
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      "sb-example-auth-token",
      "session-payload",
      expect.objectContaining({ path: "/", httpOnly: true })
    );
  });

  it("does not touch cookies when exchange fails", async () => {
    mocks.createServerClient.mockReturnValue(
      makeSupabaseClient({ message: "invalid grant", status: 400, code: "invalid_grant", name: "AuthApiError" })
    );
    const request = makeRequest("http://localhost:3000/auth/callback?code=bad");
    await GET(request);
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
  });

  it("logs rich diagnostic on exchange failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createServerClient.mockReturnValue(
      makeSupabaseClient({ message: "invalid grant", status: 400, code: "invalid_grant", name: "AuthApiError" })
    );
    await GET(makeRequest("http://localhost:3000/auth/callback?code=bad"));
    expect(errorSpy).toHaveBeenCalledWith(
      "[auth/callback] exchangeCodeForSession failed",
      expect.objectContaining({ status: 400, code: "invalid_grant", name: "AuthApiError" })
    );
    errorSpy.mockRestore();
  });
});

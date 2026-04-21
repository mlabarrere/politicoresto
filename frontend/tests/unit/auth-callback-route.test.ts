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

  it("redirects to /auth/auth-code-error with oauth_missing_code when no code param", async () => {
    const request = makeRequest("http://localhost:3000/auth/callback");
    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/auth/auth-code-error");
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

  it("redirects to /auth/auth-code-error with oauth_exchange_failed on error", async () => {
    mocks.createServerClient.mockReturnValue(makeSupabaseClient({ message: "exchange failed" }));
    const request = makeRequest("http://localhost:3000/auth/callback?code=bad-code");
    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/auth/auth-code-error");
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
  // Supabase SSR écrit les cookies via setAll qu'on passe — ils DOIVENT être
  // attachés à l'objet NextResponse retourné (pas à `cookies()` de next/headers
  // qui n'est pas toujours propagé à `NextResponse.redirect`).

  it("persists session cookies on the response when exchange succeeds (anti-regression)", async () => {
    mocks.createServerClient.mockReturnValue(makeSupabaseClient(null));
    const request = makeRequest("http://localhost:3000/auth/callback?code=abc&next=/");
    const response = await GET(request);
    const setCookie = response.cookies.get("sb-example-auth-token");
    expect(setCookie).toBeDefined();
    expect(setCookie?.value).toBe("session-payload");
  });

  it("does not post session cookies when exchange fails", async () => {
    mocks.createServerClient.mockReturnValue(
      makeSupabaseClient({ message: "invalid grant", status: 400, code: "invalid_grant", name: "AuthApiError" })
    );
    const request = makeRequest("http://localhost:3000/auth/callback?code=bad");
    const response = await GET(request);
    expect(response.cookies.get("sb-example-auth-token")).toBeUndefined();
  });

  // Rich diagnostic logging on exchange failure is now emitted via the Pino
  // logger (see lib/logger.ts logError). Logger behavior is covered by
  // tests/unit/logger.test.ts; here we only assert the redirect contract.
});

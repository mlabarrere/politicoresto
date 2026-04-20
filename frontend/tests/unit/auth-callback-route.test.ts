import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  createServerClient: vi.fn()
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

import { GET } from "@/app/auth/callback/route";

function makeRequest(url: string) {
  return new NextRequest(url);
}

function makeSupabaseClient(error: unknown = null) {
  return {
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession.mockResolvedValue({ error }),
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
});

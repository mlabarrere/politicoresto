import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { OAuthButtons } from "@/components/auth/oauth-buttons";

const signInMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signInWithOAuth: signInMock }
  })
}));

// jsdom : window.location n'est pas configurable par défaut. On remplace une
// seule fois avant les tests pour pouvoir espionner assign().
const assignMock = vi.fn();
const ORIGIN = "http://localhost:3000";

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { origin: ORIGIN, assign: assignMock }
  });
});

describe("OAuthButtons", () => {
  beforeEach(() => {
    signInMock.mockReset();
    assignMock.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("calls signInWithOAuth with redirectTo = origin + /auth/callback?next=<next>", async () => {
    signInMock.mockResolvedValue({ data: { url: "https://accounts.google.com/oauth2/xyz" }, error: null });

    render(<OAuthButtons next="/me" />);
    fireEvent.click(screen.getByRole("button", { name: /Continuer avec Google/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledTimes(1));
    const [[payload]] = signInMock.mock.calls;
    expect(payload.provider).toBe("google");
    expect(payload.options.redirectTo).toBe(
      `${ORIGIN}/auth/callback?next=${encodeURIComponent("/me")}`
    );
  });

  it("falls back to '/' when next is not safe", async () => {
    signInMock.mockResolvedValue({ data: { url: "https://accounts.google.com/oauth2/xyz" }, error: null });

    render(<OAuthButtons next="//evil.com" />);
    fireEvent.click(screen.getByRole("button", { name: /Continuer avec Google/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalled());
    const [[payload]] = signInMock.mock.calls;
    expect(payload.options.redirectTo).toBe(
      `${ORIGIN}/auth/callback?next=${encodeURIComponent("/")}`
    );
  });

  it("navigates to data.url on success", async () => {
    signInMock.mockResolvedValue({ data: { url: "https://accounts.google.com/oauth2/xyz" }, error: null });

    render(<OAuthButtons />);
    fireEvent.click(screen.getByRole("button", { name: /Continuer avec Google/i }));

    await waitFor(() =>
      expect(assignMock).toHaveBeenCalledWith("https://accounts.google.com/oauth2/xyz")
    );
  });

  it("shows a diagnostic error message when signInWithOAuth fails", async () => {
    signInMock.mockResolvedValue({
      data: { url: null },
      error: { message: "network timeout", status: 503, name: "AuthRetryableFetchError" }
    });

    render(<OAuthButtons />);
    fireEvent.click(screen.getByRole("button", { name: /Continuer avec Google/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("alert").textContent?.toLowerCase()
      ).toContain("connexion google impossible")
    );
    expect(screen.getByRole("alert").textContent).toMatch(/503/);
    expect(screen.getByRole("alert").textContent).toMatch(/AuthRetryableFetchError/);
  });

  it("shows provider-disabled message when Supabase rejects the provider", async () => {
    signInMock.mockResolvedValue({
      data: { url: null },
      error: { message: "Provider is not enabled", status: 400, name: "AuthApiError" }
    });

    render(<OAuthButtons />);
    fireEvent.click(screen.getByRole("button", { name: /Continuer avec Google/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent?.toLowerCase()).toContain(
        "activez le provider google"
      )
    );
  });

  it("shows explicit error when no URL returned by Supabase", async () => {
    signInMock.mockResolvedValue({ data: { url: null }, error: null });

    render(<OAuthButtons />);
    fireEvent.click(screen.getByRole("button", { name: /Continuer avec Google/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent?.toLowerCase()).toContain("pas d'url")
    );
  });
});

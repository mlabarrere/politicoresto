import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "@/app/auth/login/page";

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...(props as Record<string, unknown>)} />
  )
}));

vi.mock("@/components/auth/oauth-buttons", () => ({
  OAuthButtons: ({ initialError }: { next?: string; initialError?: string | null }) => (
    <div>
      <button type="button">Continuer avec Google</button>
      {initialError ? <p role="alert">{initialError}</p> : null}
    </div>
  )
}));

vi.mock("@/lib/config/site", () => ({
  siteConfig: { name: "PoliticoResto" }
}));

describe("LoginPage", () => {
  it("renders site name and login CTA", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("PoliticoResto")).toBeInTheDocument();
    expect(screen.getByText(/Se connecter ou cr.+er un compte/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuer avec Google/i })).toBeInTheDocument();
  });

  it("shows no error by default", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows simplified error for oauth_missing_code", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ auth_error: "oauth_missing_code" }) }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/connexion a echoue/i);
  });

  it("shows simplified error for oauth_exchange_failed", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ auth_error: "oauth_exchange_failed" }) }));
    expect(screen.getByRole("alert")).toHaveTextContent(/session n'a pas pu/i);
  });

  it("renders terms of use notice", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/conditions d.utilisation/i)).toBeInTheDocument();
  });
});

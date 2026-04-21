import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "@/app/auth/login/page";

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...(props as Record<string, unknown>)} />
  )
}));

vi.mock("@/components/auth/oauth-buttons", () => ({
  OAuthButtons: () => (
    <div>
      <button type="button">Continuer avec Google</button>
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

  it("shows no error alert (errors now handled by /auth/auth-code-error)", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders terms of use notice", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/conditions d.utilisation/i)).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppHeader } from "@/components/layout/app-header";

type MockLinkProps = {
  children?: ReactNode;
  href?: string;
};

type MockImageProps = {
  alt?: string;
  [key: string]: unknown;
};

type MockButtonProps = {
  children?: ReactNode;
  href?: string;
  [key: string]: unknown;
};

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: MockImageProps) => <img alt={alt ?? ""} {...props} />
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: MockLinkProps & Record<string, unknown>) => (
    <a href={href ?? "#"} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/components/app/app-primary-cta", () => ({
  AppPrimaryCTA: () => <button type="button">Créer</button>
}));

vi.mock("@/components/navigation/main-nav", () => ({
  MainNav: () => <nav aria-label="Navigation principale">Main nav</nav>
}));

vi.mock("@/components/auth/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Se déconnecter</button>
}));

vi.mock("@/components/app/app-drawer", () => ({
  AppDrawer: ({ trigger }: { trigger: ReactNode }) => <div>{trigger}</div>
}));

vi.mock("@/components/app/app-button", () => ({
  AppButton: ({ children, href, ...props }: MockButtonProps) =>
    href ? (
      <a href={href} {...props}>
        {children}
      </a>
    ) : (
      <button type="button" {...props}>
        {children}
      </button>
    )
}));

describe("AppHeader", () => {
  it("renders global create CTA in header", () => {
    render(<AppHeader isAuthenticated />);

    expect(screen.getByRole("button", { name: /Cr.+er/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation principale" })).toBeInTheDocument();
  });

  it("renders auth entry when user is unauthenticated", () => {
    render(<AppHeader isAuthenticated={false} />);

    expect(screen.getByRole("link", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toBeInTheDocument();
  });
});

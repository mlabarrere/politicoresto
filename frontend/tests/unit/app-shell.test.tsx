import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [] }))
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getClaims: vi.fn(async () => ({ data: { claims: null }, error: null }))
    }
  }))
}));

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <header>Header</header>
}));

vi.mock("@/components/layout/site-footer", () => ({
  SiteFooter: () => <footer>Footer</footer>
}));

vi.mock("@/components/app/app-primary-cta", () => ({
  AppPrimaryCTA: ({ mode }: { mode?: "inline" | "fab" }) => <button type="button">Cr�er {mode ?? "inline"}</button>
}));

describe("AppShell", () => {
  it("renders global mobile FAB create entrypoint", async () => {
    render(await AppShell({ children: <div>Page content</div> as ReactNode }));

    expect(screen.getByText("Cr�er fab")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
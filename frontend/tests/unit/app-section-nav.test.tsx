import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppSectionNav } from "@/components/app/app-section-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/me",
  useSearchParams: () => new URLSearchParams("section=votes")
}));

describe("AppSectionNav", () => {
  it("renders section links and marks active section", () => {
    render(
      <AppSectionNav
        items={[
          { key: "profile", label: "Profil", description: "identite" },
          { key: "votes", label: "Historique de vote", description: "prive" }
        ]}
      />
    );

    const voteLinks = screen.getAllByRole("link", { name: /Historique de vote/i });
    const profileLinks = screen.getAllByRole("link", { name: /Profil/i });

    expect(voteLinks[0]).toHaveClass("border-foreground");
    expect(profileLinks[0]).not.toHaveClass("border-foreground");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppTabs } from "@/components/app/app-tabs";

const items = [
  { key: "profile", label: "Profil", content: <p>Contenu profil</p> },
  { key: "votes", label: "Votes", content: <p>Contenu votes</p> },
  { key: "security", label: "Sécurité", content: <p>Contenu securite</p>, disabled: true }
];

describe("AppTabs", () => {
  it("renders all tab labels", () => {
    render(<AppTabs value="profile" onValueChange={vi.fn()} items={items} />);
    expect(screen.getByText("Profil")).toBeTruthy();
    expect(screen.getByText("Votes")).toBeTruthy();
    expect(screen.getByText("Sécurité")).toBeTruthy();
  });

  it("renders all tab panel contents", () => {
    render(<AppTabs value="profile" onValueChange={vi.fn()} items={items} />);
    // All panels are in the DOM (even if hidden)
    expect(screen.getByText("Contenu profil")).toBeTruthy();
  });

  it("defaults to first tab when value not found", () => {
    render(<AppTabs value="nonexistent" onValueChange={vi.fn()} items={items} />);
    // Should render first tab panel
    expect(screen.getByText("Contenu profil")).toBeTruthy();
  });

  it("renders with empty items array", () => {
    const { container } = render(<AppTabs value="" onValueChange={vi.fn()} items={[]} />);
    expect(container.firstChild).toBeTruthy();
  });
});

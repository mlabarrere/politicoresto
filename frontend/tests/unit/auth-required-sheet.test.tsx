import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthRequiredSheet } from "@/components/auth/auth-required-sheet";

describe("AuthRequiredSheet", () => {
  it("renders trigger button with correct aria-label", () => {
    render(
      <AuthRequiredSheet
        triggerContent={<span>Réagir</span>}
        triggerLabel="Réagir au post"
        triggerClassName="custom-class"
        nextPath="/post/some-slug"
      />
    );
    const button = screen.getByRole("button", { name: "Réagir au post" });
    expect(button).toBeTruthy();
  });

  it("applies trigger className to button", () => {
    render(
      <AuthRequiredSheet
        triggerContent={<span>Vote</span>}
        triggerLabel="Voter"
        triggerClassName="my-custom-class"
        nextPath="/post/abc"
      />
    );
    const button = screen.getByRole("button", { name: "Voter" });
    expect(button.className).toContain("my-custom-class");
  });

  it("renders trigger content inside the button", () => {
    render(
      <AuthRequiredSheet
        triggerContent={<span data-testid="trigger-icon">👍</span>}
        triggerLabel="Approuver"
        triggerClassName=""
        nextPath="/"
      />
    );
    expect(screen.getByTestId("trigger-icon")).toBeTruthy();
  });

  it("accepts any nextPath string without throwing", () => {
    // Links inside the drawer aren't rendered until the drawer is opened.
    // We just ensure the component mounts without error when nextPath has special chars.
    expect(() =>
      render(
        <AuthRequiredSheet
          triggerContent={<span>Action</span>}
          triggerLabel="Action"
          triggerClassName=""
          nextPath="/post/mon post spécial"
        />
      )
    ).not.toThrow();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReactionBar } from "@/components/social/reaction-bar";

vi.mock("@/lib/actions/reactions", () => ({
  reactAction: vi.fn()
}));

describe("reaction bar auth gate", () => {
  it("renders icon-based arrows (no ASCII fallback)", () => {
    const { container } = render(
      <ReactionBar
        targetType="thread_post"
        targetId="post-1"
        redirectPath="/thread/thread-1"
        leftVotes={2}
        rightVotes={1}
        isAuthenticated={true}
      />
    );

    expect(container.querySelectorAll("svg").length).toBeGreaterThan(1);
    expect(container.textContent?.includes("<-")).toBe(false);
    expect(container.textContent?.includes("->")).toBe(false);
  });

  it("opens auth sheet for logged-out reaction", () => {
    render(
      <ReactionBar
        targetType="thread_post"
        targetId="post-1"
        redirectPath="/thread/thread-1"
        leftVotes={2}
        rightVotes={1}
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByLabelText("C'est de gauche !"));

    expect(screen.getByText("Se connecter")).toBeInTheDocument();
    expect(screen.getByText("Creer un compte")).toBeInTheDocument();
    expect(screen.queryByText("Le thread n'a pas pu etre charge")).not.toBeInTheDocument();
  });

  it("submits gauche and droite payloads for thread targets", () => {
    const { container } = render(
      <ReactionBar
        targetType="thread_post"
        targetId="thread-post-123"
        redirectPath="/thread/demo"
        leftVotes={4}
        rightVotes={9}
        isAuthenticated={true}
      />
    );

    const forms = Array.from(container.querySelectorAll("form"));
    expect(forms.length).toBe(2);

    const leftForm = forms.find((form) => (form.querySelector('input[name="reaction_side"]') as HTMLInputElement)?.value === "gauche");
    const rightForm = forms.find((form) => (form.querySelector('input[name="reaction_side"]') as HTMLInputElement)?.value === "droite");

    expect(leftForm).toBeTruthy();
    expect(rightForm).toBeTruthy();
    expect((leftForm?.querySelector('input[name="target_type"]') as HTMLInputElement).value).toBe("thread_post");
    expect((rightForm?.querySelector('input[name="target_type"]') as HTMLInputElement).value).toBe("thread_post");
    expect(leftForm?.textContent).toContain("4");
    expect(rightForm?.textContent).toContain("9");
  });

  it("submits gauche and droite payloads for comment targets", () => {
    const { container } = render(
      <ReactionBar
        targetType="comment"
        targetId="comment-456"
        redirectPath="/thread/demo"
        leftVotes={1}
        rightVotes={2}
        isAuthenticated={true}
      />
    );

    const forms = Array.from(container.querySelectorAll("form"));
    expect(forms.length).toBe(2);
    expect(forms.every((form) => (form.querySelector('input[name="target_type"]') as HTMLInputElement).value === "comment")).toBe(true);
    expect(forms.some((form) => (form.querySelector('input[name="reaction_side"]') as HTMLInputElement).value === "gauche")).toBe(true);
    expect(forms.some((form) => (form.querySelector('input[name="reaction_side"]') as HTMLInputElement).value === "droite")).toBe(true);
  });
});

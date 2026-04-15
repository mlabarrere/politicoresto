import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReactionBar } from "@/components/social/reaction-bar";

vi.mock("@/lib/actions/reactions", () => ({
  reactAction: vi.fn()
}));

describe("reaction bar auth gate", () => {
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
});

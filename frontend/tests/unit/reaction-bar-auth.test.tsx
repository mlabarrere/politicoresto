import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReactionBar } from "@/components/social/reaction-bar";

type ReactionResponse = {
  leftVotes: number;
  rightVotes: number;
  currentVote: "gauche" | "droite" | null;
};

function mockFetchSequence(...responses: ReactionResponse[]) {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => response
    } as Response);
  }

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("reaction bar auth gate and toggle flow", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("click gauche twice removes vote", async () => {
    mockFetchSequence(
      { leftVotes: 3, rightVotes: 1, currentVote: "gauche" },
      { leftVotes: 2, rightVotes: 1, currentVote: null }
    );

    render(
      <ReactionBar
        targetType="thread_post"
        targetId="post-1"
        redirectPath="/thread/thread-1"
        leftVotes={2}
        rightVotes={1}
        currentVote={null}
        isAuthenticated
      />
    );

    const leftButton = screen.getByLabelText("C'est de gauche !");
    fireEvent.click(leftButton);

    await waitFor(() => {
      expect(leftButton).toHaveAttribute("aria-pressed", "true");
      expect(leftButton).toHaveTextContent("3");
    });

    fireEvent.click(leftButton);

    await waitFor(() => {
      expect(leftButton).toHaveAttribute("aria-pressed", "false");
      expect(leftButton).toHaveTextContent("2");
    });
  });

  it("click droite twice removes vote", async () => {
    mockFetchSequence(
      { leftVotes: 2, rightVotes: 2, currentVote: "droite" },
      { leftVotes: 2, rightVotes: 1, currentVote: null }
    );

    render(
      <ReactionBar
        targetType="thread_post"
        targetId="post-2"
        redirectPath="/thread/thread-1"
        leftVotes={2}
        rightVotes={1}
        currentVote={null}
        isAuthenticated
      />
    );

    const rightButton = screen.getByLabelText("C'est de droite !");
    fireEvent.click(rightButton);

    await waitFor(() => {
      expect(rightButton).toHaveAttribute("aria-pressed", "true");
      expect(rightButton).toHaveTextContent("2");
    });

    fireEvent.click(rightButton);

    await waitFor(() => {
      expect(rightButton).toHaveAttribute("aria-pressed", "false");
      expect(rightButton).toHaveTextContent("1");
    });
  });

  it("switches gauche to droite", async () => {
    mockFetchSequence({ leftVotes: 2, rightVotes: 4, currentVote: "droite" });

    render(
      <ReactionBar
        targetType="comment"
        targetId="comment-1"
        redirectPath="/thread/thread-1"
        leftVotes={3}
        rightVotes={3}
        currentVote="gauche"
        isAuthenticated
      />
    );

    const leftButton = screen.getByLabelText("C'est de gauche !");
    const rightButton = screen.getByLabelText("C'est de droite !");
    fireEvent.click(rightButton);

    await waitFor(() => {
      expect(leftButton).toHaveAttribute("aria-pressed", "false");
      expect(rightButton).toHaveAttribute("aria-pressed", "true");
      expect(leftButton).toHaveTextContent("2");
      expect(rightButton).toHaveTextContent("4");
    });
  });

  it("switches droite to gauche", async () => {
    mockFetchSequence({ leftVotes: 5, rightVotes: 0, currentVote: "gauche" });

    render(
      <ReactionBar
        targetType="comment"
        targetId="comment-2"
        redirectPath="/thread/thread-1"
        leftVotes={4}
        rightVotes={1}
        currentVote="droite"
        isAuthenticated
      />
    );

    const leftButton = screen.getByLabelText("C'est de gauche !");
    const rightButton = screen.getByLabelText("C'est de droite !");
    fireEvent.click(leftButton);

    await waitFor(() => {
      expect(leftButton).toHaveAttribute("aria-pressed", "true");
      expect(rightButton).toHaveAttribute("aria-pressed", "false");
      expect(leftButton).toHaveTextContent("5");
      expect(rightButton).toHaveTextContent("0");
    });
  });

  it("renders active UI state from server data", () => {
    vi.stubGlobal("fetch", vi.fn());

    render(
      <ReactionBar
        targetType="thread_post"
        targetId="post-3"
        redirectPath="/thread/thread-1"
        leftVotes={7}
        rightVotes={3}
        currentVote="droite"
        isAuthenticated
      />
    );

    const leftButton = screen.getByLabelText("C'est de gauche !");
    const rightButton = screen.getByLabelText("C'est de droite !");

    expect(leftButton).toHaveAttribute("aria-pressed", "false");
    expect(rightButton).toHaveAttribute("aria-pressed", "true");
    expect(rightButton).toHaveAttribute("data-active", "true");
  });

  it("opens auth sheet for logged-out reaction and does not call server", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReactionBar
        targetType="thread_post"
        targetId="post-4"
        redirectPath="/thread/thread-1"
        leftVotes={2}
        rightVotes={1}
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByLabelText("C'est de gauche !"));

    expect(screen.getByText("Se connecter")).toBeInTheDocument();
    expect(screen.getByText("Creer un compte")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

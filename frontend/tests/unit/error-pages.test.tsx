import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PostNotFound from "@/app/(public)/post/[slug]/not-found";
import PostError from "@/app/(public)/post/[slug]/error";
import NotFound from "@/app/not-found";
import { ScreenState } from "@/components/layout/screen-state";

describe("PostNotFound", () => {
  it("renders without crashing", () => {
    const { container } = render(<PostNotFound />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows 'Post introuvable' text", () => {
    render(<PostNotFound />);
    expect(screen.getByText("Post introuvable")).toBeTruthy();
  });
});

describe("NotFound", () => {
  it("renders without crashing", () => {
    const { container } = render(<NotFound />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows 'Page introuvable' text", () => {
    render(<NotFound />);
    expect(screen.getByText("Page introuvable")).toBeTruthy();
  });
});

describe("PostError", () => {
  it("renders error screen with retry button", () => {
    const reset = vi.fn();
    render(
      <PostError
        error={new Error("test error")}
        reset={reset}
      />
    );
    expect(screen.getByText("Le post n'a pas pu etre charge")).toBeTruthy();
    const retryButton = screen.getByText("Reessayer");
    expect(retryButton).toBeTruthy();
  });

  it("calls reset when retry button is clicked", () => {
    const reset = vi.fn();
    render(<PostError error={new Error("test")} reset={reset} />);
    fireEvent.click(screen.getByText("Reessayer"));
    expect(reset).toHaveBeenCalled();
  });
});

describe("ScreenState", () => {
  it("renders title and body", () => {
    render(<ScreenState title="Erreur" body="Description de l'erreur" />);
    expect(screen.getByText("Erreur")).toBeTruthy();
    expect(screen.getByText("Description de l'erreur")).toBeTruthy();
  });

  it("renders action link when provided", () => {
    render(
      <ScreenState
        title="Titre"
        body="Corps"
        actionHref="/"
        actionLabel="Retour"
      />
    );
    expect(screen.getByText("Retour")).toBeTruthy();
  });

  it("does not render link when actionHref is absent", () => {
    render(<ScreenState title="Titre" body="Corps" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders retry button when onRetry and retryLabel provided", () => {
    const onRetry = vi.fn();
    render(
      <ScreenState
        title="Titre"
        body="Corps"
        onRetry={onRetry}
        retryLabel="Reessayer"
      />
    );
    const button = screen.getByText("Reessayer");
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalled();
  });

  it("does not render retry button when onRetry is absent", () => {
    render(<ScreenState title="Titre" body="Corps" retryLabel="Reessayer" />);
    expect(screen.queryByText("Reessayer")).toBeNull();
  });
});

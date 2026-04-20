import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppDraftList } from "@/components/app/app-draft-list";
import { AppPostHistoryList } from "@/components/app/app-post-history-list";
import { AppCommentHistoryList } from "@/components/app/app-comment-history-list";

// ─── AppDraftList ──────────────────────────────────────────────────────
describe("AppDraftList", () => {
  it("shows loading state", () => {
    render(<AppDraftList items={[]} loading />);
    expect(screen.getByText(/brouillons/i)).toBeTruthy();
  });

  it("shows unavailable state", () => {
    render(<AppDraftList items={[]} status="unavailable" />);
    expect(screen.getByText("Brouillons indisponibles temporairement")).toBeTruthy();
  });

  it("shows error state", () => {
    render(<AppDraftList items={[]} status="error" />);
    expect(screen.getByText("Brouillons indisponibles")).toBeTruthy();
  });

  it("shows empty state", () => {
    render(<AppDraftList items={[]} />);
    expect(screen.getByText("Aucun brouillon")).toBeTruthy();
  });

  it("renders draft items with type labels", () => {
    const items = [
      { id: "d1", type: "article", title: "Mon brouillon", updated_at: "2026-01-01T00:00:00Z" },
      { id: "d2", type: "poll", title: null, updated_at: "2026-01-01T00:00:00Z" },
      { id: "d3", type: "market", title: "Pari test", updated_at: "2026-01-01T00:00:00Z" }
    ];
    render(<AppDraftList items={items} />);
    expect(screen.getByText("Mon brouillon")).toBeTruthy();
    expect(screen.getByText("Brouillon sans titre")).toBeTruthy();
    expect(screen.getByText("Sondage")).toBeTruthy();
    expect(screen.getByText("Pari")).toBeTruthy();
  });
});

// ─── AppPostHistoryList ────────────────────────────────────────────────
describe("AppPostHistoryList", () => {
  it("shows loading state", () => {
    render(<AppPostHistoryList items={[]} loading />);
    expect(screen.getByText(/publications/i)).toBeTruthy();
  });

  it("shows unavailable state", () => {
    render(<AppPostHistoryList items={[]} status="unavailable" />);
    expect(screen.getByText("Publications indisponibles temporairement")).toBeTruthy();
  });

  it("shows error state", () => {
    render(<AppPostHistoryList items={[]} status="error" />);
    expect(screen.getByText("Publications indisponibles")).toBeTruthy();
  });

  it("shows empty state", () => {
    render(<AppPostHistoryList items={[]} />);
    expect(screen.getByText("Aucune publication")).toBeTruthy();
  });

  it("renders post items with type labels", () => {
    const items = [
      {
        id: "p1",
        post_id: "t1",
        type: "poll",
        title: "Mon sondage",
        status: "visible",
        entity_name: "Politique",
        created_at: "2026-01-01T00:00:00Z"
      },
      {
        id: "p2",
        post_id: "t2",
        type: "article",
        title: null,
        status: "draft",
        entity_name: null,
        created_at: "2026-01-01T00:00:00Z"
      }
    ];
    render(<AppPostHistoryList items={items} />);
    expect(screen.getByText("Mon sondage")).toBeTruthy();
    expect(screen.getByText("Post sans titre")).toBeTruthy();
    expect(screen.getByText(/General/)).toBeTruthy();
  });
});

// ─── AppCommentHistoryList ─────────────────────────────────────────────
describe("AppCommentHistoryList", () => {
  it("shows loading state", () => {
    render(<AppCommentHistoryList items={[]} loading />);
    expect(screen.getByText(/commentaires/i)).toBeTruthy();
  });

  it("shows unavailable state", () => {
    render(<AppCommentHistoryList items={[]} status="unavailable" />);
    expect(screen.getByText("Commentaires indisponibles temporairement")).toBeTruthy();
  });

  it("shows error state", () => {
    render(<AppCommentHistoryList items={[]} status="error" />);
    expect(screen.getByText("Commentaires indisponibles")).toBeTruthy();
  });

  it("shows empty state", () => {
    render(<AppCommentHistoryList items={[]} />);
    expect(screen.getByText("Aucun commentaire")).toBeTruthy();
  });

  it("renders comment items with excerpt", () => {
    const items = [
      {
        id: "c1",
        body_markdown: "Mon commentaire",
        parentTitle: "Post parent",
        post_status: "visible",
        created_at: "2026-01-01T00:00:00Z"
      }
    ];
    render(<AppCommentHistoryList items={items} />);
    expect(screen.getByText("Mon commentaire")).toBeTruthy();
    expect(screen.getByText(/Post parent/)).toBeTruthy();
  });

  it("truncates long comment bodies", () => {
    const longBody = "a".repeat(200);
    const items = [
      { id: "c1", body_markdown: longBody, parentTitle: null, post_status: "visible", created_at: "2026-01-01T00:00:00Z" }
    ];
    render(<AppCommentHistoryList items={items} />);
    const el = screen.getByText(/a+\.\.\./);
    expect(el.textContent?.length).toBeLessThan(200);
  });

  it("handles null parentTitle", () => {
    const items = [
      { id: "c1", body_markdown: "Texte", parentTitle: null, post_status: "visible", created_at: "2026-01-01T00:00:00Z" }
    ];
    render(<AppCommentHistoryList items={items} />);
    expect(screen.getByText(/Non disponible/)).toBeTruthy();
  });
});

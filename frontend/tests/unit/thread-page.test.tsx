import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ThreadDetailPage from "@/app/(public)/thread/[slug]/page";
import { getThreadDetail } from "@/lib/data/public/threads";
import { createServerSupabaseClient } from "@/lib/supabase/server";

vi.mock("@/lib/data/public/threads", () => ({
  getThreadDetail: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

const mockedGetThreadDetail = vi.mocked(getThreadDetail);
const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

describe("thread page forum UX", () => {
  beforeEach(() => {
    mockedGetThreadDetail.mockReset();
    mockedCreateServerSupabaseClient.mockReset();

    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } })
      }
    } as never);
  });

  it("renders OP and comments with normalized line breaks and strict forum order", async () => {
    mockedGetThreadDetail.mockResolvedValue({
      thread: {
        id: "t1",
        space_id: null,
        slug: "thread-1",
        title: "Thread test",
        description: null,
        topic_status: "open",
        visibility: "public",
        open_at: "2026-04-14T00:00:00.000Z",
        close_at: "2026-04-21T00:00:00.000Z",
        created_at: "2026-04-14T00:00:00.000Z"
      },
      threadPosts: [
        {
          id: "op1",
          thread_id: "t1",
          type: "article",
          title: "Thread test",
          content: "Ligne 1\\n\\nLigne 2",
          metadata: {
            source_url: "https://example.com/article",
            link_preview: {
              title: "Titre article",
              description: "Description article",
              siteName: "Example"
            }
          },
          entity_slug: null,
          entity_name: null,
          created_by: "u1",
          username: "alice",
          display_name: "Alice",
          created_at: "2026-04-14T00:00:00.000Z",
          updated_at: "2026-04-14T00:00:00.000Z",
          status: "published",
          gauche_count: 2,
          droite_count: 1,
          weighted_votes: 1,
          comment_count: 2
        }
      ],
      comments: [
        {
          id: "c1",
          thread_id: "t1",
          thread_post_id: "op1",
          parent_post_id: null,
          depth: 0,
          author_user_id: "u2",
          username: "bob",
          display_name: "Bob",
          title: null,
          body_markdown: "Commentaire parent\\navec retour",
          created_at: "2026-04-14T01:00:00.000Z",
          updated_at: "2026-04-14T01:00:00.000Z",
          post_status: "visible",
          gauche_count: 1,
          droite_count: 2,
          comment_score: 0
        },
        {
          id: "c2",
          thread_id: "t1",
          thread_post_id: "op1",
          parent_post_id: "c1",
          depth: 1,
          author_user_id: "u3",
          username: "charlie",
          display_name: "Charlie",
          title: null,
          body_markdown: "Sous-commentaire",
          created_at: "2026-04-14T02:00:00.000Z",
          updated_at: "2026-04-14T02:00:00.000Z",
          post_status: "visible",
          gauche_count: 3,
          droite_count: 0,
          comment_score: 0
        }
      ]
    });

    render(await ThreadDetailPage({ params: Promise.resolve({ slug: "thread-1" }) }));

    expect(
      screen.getAllByText((content) => content.includes("Ligne 1") && content.includes("Ligne 2")).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/\\n/)).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Post principal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Actions du post")).toBeInTheDocument();
    expect(screen.getByLabelText("Outils du thread")).toBeInTheDocument();
    expect(screen.getByTestId("comment-thread")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Classer gauche").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Classer droite").length).toBeGreaterThan(0);
    expect(
      screen.getByText((content) => content.includes("Commentaire parent") && content.includes("avec retour"))
    ).toBeInTheDocument();
    expect(screen.getByText("Sous-commentaire")).toBeInTheDocument();
  });

  it("opens auth sheet for logged-out reactions without thread load error", async () => {
    mockedGetThreadDetail.mockResolvedValue({
      thread: {
        id: "t1",
        space_id: null,
        slug: "thread-1",
        title: "Thread test",
        description: null,
        topic_status: "open",
        visibility: "public",
        open_at: "2026-04-14T00:00:00.000Z",
        close_at: "2026-04-21T00:00:00.000Z",
        created_at: "2026-04-14T00:00:00.000Z"
      },
      threadPosts: [
        {
          id: "op1",
          thread_id: "t1",
          type: "article",
          title: "Thread test",
          content: "Contenu",
          metadata: {},
          entity_slug: null,
          entity_name: null,
          created_by: "u1",
          username: "alice",
          display_name: "Alice",
          created_at: "2026-04-14T00:00:00.000Z",
          updated_at: "2026-04-14T00:00:00.000Z",
          status: "published",
          gauche_count: 0,
          droite_count: 0,
          weighted_votes: 0,
          comment_count: 0
        }
      ],
      comments: []
    });

    render(await ThreadDetailPage({ params: Promise.resolve({ slug: "thread-1" }) }));

    fireEvent.click(screen.getAllByLabelText("Classer gauche")[0]);

    expect(screen.getByText("Se connecter")).toBeInTheDocument();
    expect(screen.getByText("Créer un compte")).toBeInTheDocument();
    expect(screen.queryByText("Le thread n'a pas pu etre charge")).not.toBeInTheDocument();
  });
});

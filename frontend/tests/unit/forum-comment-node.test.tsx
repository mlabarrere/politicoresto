import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CommentNode } from "@/components/forum/comment-node";
import type { CommentTreeNode } from "@/lib/types/forum";

const node: CommentTreeNode = {
  id: "comment-1",
  author: { id: "user-1", username: "Alice" },
  createdAt: "2026-04-14T00:00:00.000Z",
  updatedAt: "2026-04-14T00:00:00.000Z",
  body: "Texte",
  depth: 0,
  parentCommentId: null,
  leftCount: 1,
  rightCount: 0,
  currentUserVote: null,
  replyCount: 0,
  isEdited: false,
  children: []
};

describe("comment node behavior", () => {
  it("opens reply composer and cancel returns read mode", () => {
    render(
      <CommentNode
        node={node}
        depth={0}
        maxInlineDepth={6}
        currentUserId="user-1"
        collapsedAll={false}
        redirectPath="/post/test"
        onReplySubmit={vi.fn().mockResolvedValue(undefined)}
        onEditSubmit={vi.fn().mockResolvedValue(undefined)}
        onDeleteSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /R.+pondre/i }));
    expect(screen.getByTestId("reply-composer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByTestId("reply-composer")).not.toBeInTheDocument();
  });

  it("does not allow reply and edit active together", () => {
    render(
      <CommentNode
        node={node}
        depth={0}
        maxInlineDepth={6}
        currentUserId="user-1"
        collapsedAll={false}
        redirectPath="/post/test"
        onReplySubmit={vi.fn().mockResolvedValue(undefined)}
        onEditSubmit={vi.fn().mockResolvedValue(undefined)}
        onDeleteSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /R.+pondre/i }));
    fireEvent.click(screen.getByRole("button", { name: "Actions commentaire" }));
    fireEvent.click(screen.getByText("Modifier"));

    expect(screen.getByTestId("reply-composer")).toBeInTheDocument();
    expect(screen.queryByTestId("edit-composer")).not.toBeInTheDocument();
  });
});




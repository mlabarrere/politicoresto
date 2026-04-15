import type { UserSummary, VoteSide } from "@/lib/types/domain";

export type { UserSummary, VoteSide };

export type ForumPost = {
  id: string;
  title?: string;
  author: UserSummary;
  createdAt: string;
  body: string;
  leftCount: number;
  rightCount: number;
  commentCount: number;
  currentUserVote: VoteSide;
};

export type CommentTreeNode = {
  id: string;
  author: UserSummary;
  createdAt: string;
  updatedAt?: string;
  body: string;
  depth: number;
  parentCommentId?: string | null;
  leftCount: number;
  rightCount: number;
  currentUserVote: VoteSide;
  replyCount: number;
  isEdited: boolean;
  children: CommentTreeNode[];
};

export type ReplyDraft = {
  targetType: "post" | "comment";
  targetId: string;
  parentCommentId?: string;
  body: string;
};

export type EditDraft = {
  commentId: string;
  body: string;
};



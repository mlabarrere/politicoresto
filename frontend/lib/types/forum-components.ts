import type {
  CommentTreeNode,
  EditDraft,
  ForumPost,
  ReplyDraft,
  VoteSide
} from "@/lib/types/forum";

export type ForumPageState = {
  postStatus: "loading" | "ready" | "error";
  commentsStatus: "loading" | "ready" | "error";
  sortMode: "top" | "recent" | "oldest";
  collapsedAll: boolean;
  focusedBranchId?: string;
};

export type ForumPageProps = {
  post: ForumPost;
  comments: CommentTreeNode[];
  currentUserId?: string | null;
  threadSlug: string;
};

export type PostCardProps = {
  post: ForumPost;
  currentUserVote: VoteSide;
  isAuthenticated: boolean;
  redirectPath: string;
  onVoteChange: (next: VoteSide) => Promise<void>;
  onReplyClick: () => void;
};

export type VoteBinaryLRProps = {
  value: VoteSide;
  leftCount: number;
  rightCount: number;
  disabled?: boolean;
  size?: "sm" | "md";
  entityType: "post" | "comment";
  onChange: (next: VoteSide) => void;
  isAuthenticated: boolean;
  redirectPath: string;
};

export type CommentThreadProps = {
  comments: CommentTreeNode[];
  sortMode: "top" | "recent" | "oldest";
  currentUserId?: string | null;
  maxInlineDepth: number;
  collapsedAll: boolean;
  redirectPath: string;
  onReplySubmit: (payload: ReplyDraft) => Promise<void>;
  onEditSubmit: (payload: EditDraft) => Promise<void>;
  onDeleteSubmit: (commentId: string) => Promise<void>;
  onVoteChange: (commentId: string, next: VoteSide) => Promise<void>;
};

export type CommentNodeProps = {
  node: CommentTreeNode;
  depth: number;
  maxInlineDepth: number;
  currentUserId?: string | null;
  collapsedAll: boolean;
  redirectPath: string;
  onReplySubmit: (payload: ReplyDraft) => Promise<void>;
  onEditSubmit: (payload: EditDraft) => Promise<void>;
  onDeleteSubmit: (commentId: string) => Promise<void>;
  onVoteChange: (commentId: string, next: VoteSide) => Promise<void>;
};

export type ReplyComposerProps = {
  targetType: "post" | "comment";
  targetId: string;
  parentCommentId?: string;
  initialValue?: string;
  mentionPrefix?: string;
  autoFocus?: boolean;
  onSubmit: (draft: ReplyDraft) => Promise<void>;
  onCancel: () => void;
};

export type EditComposerProps = {
  commentId: string;
  initialValue: string;
  onSubmit: (draft: EditDraft) => Promise<void>;
  onCancel: () => void;
};

export type CommentActionsMenuProps = {
  canEdit: boolean;
  canDelete: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
};

export type ThreadToolbarProps = {
  sortMode: "top" | "recent" | "oldest";
  collapsedAll: boolean;
  compactMode: boolean;
  onSortChange: (next: "top" | "recent" | "oldest") => void;
  onToggleCollapseAll: () => void;
  onToggleCompactMode: () => void;
};


import type {
  CommentTreeNode,
  EditDraft,
  ForumPost,
  ReplyDraft,
  VoteSide,
} from '@/lib/types/forum';

export interface ForumPageState {
  postStatus: 'loading' | 'ready' | 'error';
  commentsStatus: 'loading' | 'ready' | 'error';
  sortMode: 'top' | 'recent' | 'oldest';
  collapsedAll: boolean;
  focusedBranchId?: string;
}

export interface ForumPageProps {
  post: ForumPost;
  comments: CommentTreeNode[];
  currentUserId?: string | null;
  postSlug: string;
}

export interface PostCardProps {
  post: ForumPost;
  initialExpanded?: boolean;
  isAuthenticated?: boolean;
  ownerMenu?: {
    postItemId: string;
    postSlug: string;
    canEdit: boolean;
    /** If set, the edit item is shown disabled with this tooltip. */
    editLockReason?: string | null;
  } | null;
}

export interface PostActionsBarProps {
  postId: string;
  currentUserVote: VoteSide;
  leftCount: number;
  rightCount: number;
  isAuthenticated: boolean;
  redirectPath: string;
  onReplyClick: () => void;
}

export interface CommentThreadProps {
  comments: CommentTreeNode[];
  sortMode: 'top' | 'recent' | 'oldest';
  currentUserId?: string | null;
  maxInlineDepth: number;
  collapsedAll: boolean;
  redirectPath: string;
  onReplySubmit: (payload: ReplyDraft) => Promise<void>;
  onEditSubmit: (payload: EditDraft) => Promise<void>;
  onDeleteSubmit: (commentId: string) => Promise<void>;
}

export interface CommentNodeProps {
  node: CommentTreeNode;
  depth: number;
  maxInlineDepth: number;
  currentUserId?: string | null;
  collapsedAll: boolean;
  redirectPath: string;
  onReplySubmit: (payload: ReplyDraft) => Promise<void>;
  onEditSubmit: (payload: EditDraft) => Promise<void>;
  onDeleteSubmit: (commentId: string) => Promise<void>;
}

export interface ReplyComposerProps {
  targetType: 'post' | 'comment';
  targetId: string;
  parentCommentId?: string;
  initialValue?: string;
  mentionPrefix?: string;
  onSubmit: (draft: ReplyDraft) => Promise<void>;
  onCancel: () => void;
}

export interface EditComposerProps {
  commentId: string;
  initialValue: string;
  onSubmit: (draft: EditDraft) => Promise<void>;
  onCancel: () => void;
}

export interface CommentActionsMenuProps {
  canEdit: boolean;
  canDelete: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

export interface PostToolbarProps {
  sortMode: 'top' | 'recent' | 'oldest';
  onSortChange: (next: 'top' | 'recent' | 'oldest') => void;
}

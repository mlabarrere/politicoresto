import type { CommentView } from "@/lib/types/views";
import { formatDate, formatNumber } from "@/lib/utils/format";

import { ReactionBar } from "@/components/social/reaction-bar";

export function CommentItem({
  comment,
  redirectPath
}: {
  comment: CommentView;
  redirectPath: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            {comment.display_name ?? comment.username ?? "Analyste"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(comment.created_at)} · score {formatNumber(comment.comment_score ?? 0)}
          </p>
        </div>
        <ReactionBar
          targetType="comment"
          targetId={comment.id}
          redirectPath={redirectPath}
          upvotes={comment.upvote_weight ?? 0}
          downvotes={comment.downvote_weight ?? 0}
          compact
        />
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
        {comment.body_markdown}
      </p>
    </article>
  );
}

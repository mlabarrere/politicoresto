import type { CommentView } from "@/lib/types/views";
import { formatDate, formatNumber } from "@/lib/utils/format";

import { deleteCommentAction, updateCommentAction } from "@/lib/actions/comments";
import { ReactionBar } from "@/components/social/reaction-bar";

export function CommentItem({
  comment,
  redirectPath,
  canEdit = false
}: {
  comment: CommentView;
  redirectPath: string;
  canEdit?: boolean;
}) {
  return (
    <article className="rounded-xl border border-border bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {comment.display_name ?? comment.username ?? "Analyste"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(comment.created_at)} • score {formatNumber(comment.comment_score ?? 0)}
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
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/95">
        {comment.body_markdown}
      </p>
      {canEdit ? (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3">
          <form action={updateCommentAction} className="space-y-2">
            <input type="hidden" name="comment_id" value={comment.id} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <textarea
              name="body"
              defaultValue={comment.body_markdown}
              rows={3}
              className="w-full resize-y rounded-xl border border-border px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              Modifier
            </button>
          </form>
          <form action={deleteCommentAction}>
            <input type="hidden" name="comment_id" value={comment.id} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <button type="submit" className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground">
              Supprimer
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

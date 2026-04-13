import { createCommentAction } from "@/lib/actions/comments";
import type { CommentView, ThreadPostView } from "@/lib/types/views";

import { CommentItem } from "@/components/comments/comment-item";

export function CommentList({
  comments,
  redirectPath,
  defaultThreadPost
}: {
  comments: CommentView[];
  redirectPath: string;
  defaultThreadPost: ThreadPostView | null;
}) {
  return (
    <div className="space-y-4">
      {defaultThreadPost ? (
        <form action={createCommentAction} className="rounded-2xl border border-border bg-card p-4">
          <input type="hidden" name="thread_post_id" value={defaultThreadPost.id} />
          <input type="hidden" name="redirect_path" value={redirectPath} />
          <label className="block">
            <span className="eyebrow">Commenter</span>
            <textarea
              name="body"
              rows={4}
              placeholder="Ajouter un angle, une objection, un signal."
              className="mt-2 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground"
            />
          </label>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Publier
            </button>
          </div>
        </form>
      ) : null}

      {comments.length ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} redirectPath={redirectPath} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          Aucun commentaire visible.
        </div>
      )}
    </div>
  );
}

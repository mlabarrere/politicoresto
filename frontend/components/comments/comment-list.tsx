import { createCommentAction } from "@/lib/actions/comments";
import type { ThreadPostView, CommentView } from "@/lib/types/views";
import { buildCommentTree } from "@/lib/forum/comments";

import { CommentItem } from "@/components/comments/comment-item";

export function CommentList({
  comments,
  redirectPath,
  defaultThreadPost,
  currentUserId
}: {
  comments: CommentView[];
  redirectPath: string;
  defaultThreadPost: ThreadPostView | null;
  currentUserId: string | null;
}) {
  const tree = buildCommentTree(comments);

  return (
    <div className="space-y-4">
      {defaultThreadPost && currentUserId ? (
        <form id="reply-form" action={createCommentAction} className="rounded-2xl border border-border bg-card p-4">
          <input type="hidden" name="thread_post_id" value={defaultThreadPost.id} />
          <input type="hidden" name="redirect_path" value={redirectPath} />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ajouter un commentaire
            </span>
            <textarea
              name="body"
              rows={4}
              required
              placeholder="Votre commentaire..."
              className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none ring-0 placeholder:text-muted-foreground"
            />
          </label>
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90"
            >
              Publier
            </button>
          </div>
        </form>
      ) : null}
      {!currentUserId ? (
        <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          Connectez-vous pour commenter ou repondre.
        </div>
      ) : null}

      {tree.length ? (
        <div className="space-y-3">
          {tree.map((node) => (
            <CommentItem
              key={node.comment.id}
              node={node}
              depth={0}
              redirectPath={redirectPath}
              defaultThreadPostId={defaultThreadPost?.id ?? null}
              currentUserId={currentUserId}
            />
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

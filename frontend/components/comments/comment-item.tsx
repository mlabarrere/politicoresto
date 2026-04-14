import type { CommentNode } from "@/lib/forum/comments";
import { formatDate, formatNumber } from "@/lib/utils/format";

import {
  createCommentAction,
  deleteCommentAction,
  updateCommentAction
} from "@/lib/actions/comments";
import { ReactionBar } from "@/components/social/reaction-bar";
import { Separator } from "@/components/ui/separator";

export function CommentItem({
  node,
  redirectPath,
  defaultThreadPostId,
  currentUserId,
  depth
}: {
  node: CommentNode;
  redirectPath: string;
  defaultThreadPostId: string | null;
  currentUserId: string | null;
  depth: number;
}) {
  const comment = node.comment;
  const canEdit = Boolean(currentUserId && currentUserId === comment.author_user_id);
  const threadPostId = comment.thread_post_id ?? defaultThreadPostId;
  const marginLeft = Math.min(depth, 4) * 18;

  return (
    <div style={{ marginLeft }} className="space-y-2">
      <article className="rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {comment.display_name ?? comment.username ?? "Membre"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(comment.created_at)} • {formatNumber(node.reactionTotal)} reactions politiques
            </p>
          </div>
          <ReactionBar
            targetType="comment"
            targetId={comment.id}
            redirectPath={redirectPath}
            leftVotes={comment.gauche_count ?? 0}
            rightVotes={comment.droite_count ?? 0}
            compact
          />
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/95">
          {comment.body_markdown}
        </p>

        <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-background/70 p-3">
          {threadPostId && currentUserId ? (
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-foreground">Repondre</summary>
              <form action={createCommentAction} className="mt-2 space-y-2">
                <input type="hidden" name="thread_post_id" value={threadPostId} />
                <input type="hidden" name="parent_post_id" value={comment.id} />
                <input type="hidden" name="redirect_path" value={redirectPath} />
                <textarea
                  name="body"
                  required
                  rows={3}
                  placeholder="Votre reponse"
                  className="w-full resize-y rounded-xl border border-border px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                >
                  Publier la reponse
                </button>
              </form>
            </details>
          ) : null}

          {canEdit ? (
            <>
              <Separator />
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
            </>
          ) : null}
        </div>
      </article>

      {node.children.length ? (
        <div className="space-y-2">
          {node.children.map((child) => (
            <CommentItem
              key={child.comment.id}
              node={child}
              depth={depth + 1}
              redirectPath={redirectPath}
              defaultThreadPostId={defaultThreadPostId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

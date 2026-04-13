import { reactAction } from "@/lib/actions/reactions";
import { formatNumber } from "@/lib/utils/format";

export function ReactionBar({
  targetType,
  targetId,
  redirectPath,
  upvotes = 0,
  downvotes = 0,
  compact = false
}: {
  targetType: "thread_post" | "comment";
  targetId: string;
  redirectPath: string;
  upvotes?: number | null;
  downvotes?: number | null;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {(["upvote", "downvote"] as const).map((reactionType) => (
        <form key={reactionType} action={reactAction}>
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <input type="hidden" name="reaction_type" value={reactionType} />
          <input type="hidden" name="redirect_path" value={redirectPath} />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <span>{reactionType === "upvote" ? "↑" : "↓"}</span>
            {!compact ? (
              <span>{formatNumber(reactionType === "upvote" ? upvotes : downvotes)}</span>
            ) : null}
          </button>
        </form>
      ))}
    </div>
  );
}

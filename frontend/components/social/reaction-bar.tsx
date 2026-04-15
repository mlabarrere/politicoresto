"use client";

import { AuthRequiredSheet } from "@/components/auth/auth-required-sheet";
import { reactAction } from "@/lib/actions/reactions";
import { formatNumber } from "@/lib/utils/format";

const REACTIONS = [
  {
    side: "gauche",
    arrow: "<-",
    tooltip: "C'est de gauche !",
    buttonClass:
      "border-rose-300/70 bg-rose-50/80 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
  },
  {
    side: "droite",
    arrow: "->",
    tooltip: "C'est de droite !",
    buttonClass:
      "border-sky-300/70 bg-sky-50/80 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
  }
] as const;

export function ReactionBar({
  targetType,
  targetId,
  redirectPath,
  leftVotes = 0,
  rightVotes = 0,
  compact = false,
  isAuthenticated = false
}: {
  targetType: "thread_post" | "comment";
  targetId: string;
  redirectPath: string;
  leftVotes?: number | null;
  rightVotes?: number | null;
  compact?: boolean;
  isAuthenticated?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {REACTIONS.map((reaction) => {
        const button = (
          <button
            type={isAuthenticated ? "submit" : "button"}
            aria-label={reaction.tooltip}
            className={`group relative inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${reaction.buttonClass}`}
          >
            <span>{reaction.arrow}</span>
            {!compact ? (
              <span>{formatNumber(reaction.side === "gauche" ? leftVotes : rightVotes)}</span>
            ) : null}
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-[10px] whitespace-nowrap text-background opacity-0 transition group-hover:opacity-100">
              {reaction.tooltip}
            </span>
          </button>
        );

        if (!isAuthenticated) {
          return <AuthRequiredSheet key={reaction.side} nextPath={redirectPath} trigger={button} />;
        }

        return (
          <form key={reaction.side} action={reactAction}>
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <input type="hidden" name="reaction_side" value={reaction.side} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            {button}
          </form>
        );
      })}
    </div>
  );
}

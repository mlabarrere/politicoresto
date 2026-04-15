import type { PostPollSummaryView } from "@/lib/types/views";
import { cn } from "@/lib/utils";

function toWidth(share: number) {
  const value = Math.max(0, Math.min(100, share));
  return `${value}%`;
}

export function PollResults({
  poll,
  mode
}: {
  poll: PostPollSummaryView;
  mode: "raw" | "corrected";
}) {
  const points = mode === "raw" ? poll.raw_results : poll.corrected_results;

  if (!points.length) {
    return <p className="text-xs text-muted-foreground">Aucune reponse pour l'instant.</p>;
  }

  return (
    <div className="space-y-2">
      {points.map((point) => (
        <div key={`${mode}-${point.option_id}`} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground">{point.option_label}</span>
            <span className="font-medium text-foreground">{point.share.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                mode === "raw" ? "bg-slate-500" : "bg-emerald-500"
              )}
              style={{ width: toWidth(point.share) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

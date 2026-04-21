import type { PostPollSummaryView } from '@/lib/types/views';

function toWidth(sharePercent: number) {
  const value = Math.max(0, Math.min(100, sharePercent));
  return `${value}%`;
}

export function PollResults({ poll }: { poll: PostPollSummaryView }) {
  const points = poll.raw_results;

  if (!points.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucune reponse pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {points.map((point) => (
        <div key={point.option_id} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground">{point.option_label}</span>
            <span className="font-medium text-foreground">
              {point.share.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-slate-500"
              style={{ width: toWidth(point.share) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

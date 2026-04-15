import { AppCard } from "@/components/app/app-card";
import { confidenceHint, representativityLabel } from "@/lib/polls/scoring";
import type { PostPollSummaryView } from "@/lib/types/views";

export function PollConfidenceCard({ poll }: { poll: PostPollSummaryView }) {
  return (
    <AppCard className="space-y-2 border-dashed p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Representativite
      </p>
      <p className="text-lg font-semibold text-foreground">
        {poll.representativity_score.toFixed(1)} / 100 - {representativityLabel(poll.representativity_score)}
      </p>
      <p className="text-xs text-muted-foreground">{confidenceHint(poll.representativity_score, poll.sample_size)}</p>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>ESS: {poll.effective_sample_size.toFixed(1)}</span>
        <span>Panel: {poll.sample_size}</span>
      </div>
    </AppCard>
  );
}

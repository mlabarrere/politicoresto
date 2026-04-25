import { AppCard } from '@/components/app/app-card';
import { PronoBetBar } from '@/components/prono/prono-bet-bar';
import type { PronoSummaryView } from '@/lib/data/public/pronos';

export function PronoDetail({
  summary,
  isAuthenticated,
}: {
  summary: PronoSummaryView;
  isAuthenticated: boolean;
}) {
  const requesterLabel =
    summary.requested_by_username ?? summary.requested_by_display_name ?? null;

  return (
    <AppCard className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pronostic
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {summary.question_text || summary.title}
        </h2>
        <p className="text-xs text-muted-foreground">
          {requesterLabel ? `À l'initiative de @${requesterLabel}` : null}
          {requesterLabel ? ' · ' : ''}
          {summary.total_bets} pari{summary.total_bets > 1 ? 's' : ''} ·{' '}
          {summary.allow_multiple
            ? 'plusieurs réponses possibles'
            : 'une réponse'}
        </p>
      </header>
      <PronoBetBar summary={summary} isAuthenticated={isAuthenticated} />
    </AppCard>
  );
}

import Link from 'next/link';
import { AppCard } from '@/components/app/app-card';
import type { PronoSummaryView } from '@/lib/data/public/pronos';

export function PronoCardInline({ summary }: { summary: PronoSummaryView }) {
  const top = summary.options.slice(0, 3);
  return (
    <Link href={`/post/${summary.topic_slug}`} className="block">
      <AppCard className="space-y-2 transition-colors hover:bg-muted/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pronostic
        </p>
        <h3 className="text-base font-medium text-foreground">
          {summary.question_text || summary.title}
        </h3>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {top.map((option) => (
            <li key={option.id} className="flex justify-between gap-2">
              <span className="truncate">{option.label}</span>
              <span>
                {Math.round(option.share * 100)}%
                {option.odds !== null ? ` · ×${option.odds}` : ''}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {summary.total_bets} pari{summary.total_bets > 1 ? 's' : ''}
        </p>
      </AppCard>
    </Link>
  );
}

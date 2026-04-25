'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { AppButton } from '@/components/app/app-button';
import { placeBetAction, removeBetAction } from '@/lib/actions/pronos';
import { clientLog } from '@/lib/client-log';
import type {
  PronoOptionView,
  PronoSummaryView,
} from '@/lib/data/public/pronos';
import { cn } from '@/lib/utils';

const log = clientLog('prono-bet-bar');

interface OptimisticState {
  selected: ReadonlySet<string>;
}

type Patch =
  | { kind: 'select'; optionId: string }
  | { kind: 'unselect'; optionId: string };

export function PronoBetBar({
  summary,
  isAuthenticated,
}: {
  summary: PronoSummaryView;
  isAuthenticated: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const initialSelected = new Set(summary.current_user_bets);

  const [optimistic, applyPatch] = useOptimistic<OptimisticState, Patch>(
    { selected: initialSelected },
    (state, patch) => {
      const next = new Set(state.selected);
      if (patch.kind === 'select') {
        if (!summary.allow_multiple) next.clear();
        next.add(patch.optionId);
      } else {
        next.delete(patch.optionId);
      }
      return { selected: next };
    },
  );

  const isClosed =
    summary.topic_status !== 'open' || summary.betting_cutoff_at !== null;

  function toggle(option: PronoOptionView) {
    if (!isAuthenticated || isClosed || !option.is_active) return;
    setError(null);
    const wasSelected = optimistic.selected.has(option.id);
    startTransition(() => {
      applyPatch({
        kind: wasSelected ? 'unselect' : 'select',
        optionId: option.id,
      });
    });

    const fd = new FormData();
    fd.set('question_id', summary.question_id);
    fd.set('option_id', option.id);
    fd.set('topic_slug', summary.topic_slug);
    const action = wasSelected ? removeBetAction : placeBetAction;
    void action(fd).catch((err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Pari refusé. Réessayez.';
      log.error('prono_bet.failed', { message });
      setError(message);
      // Revert optimistic state — applyPatch is the inverse.
      startTransition(() => {
        applyPatch({
          kind: wasSelected ? 'select' : 'unselect',
          optionId: option.id,
        });
      });
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {summary.options
          .filter((option) => option.is_active)
          .map((option) => {
            const isPicked = optimistic.selected.has(option.id);
            const sharePct = Math.round(option.share * 100);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  toggle(option);
                }}
                aria-pressed={isPicked}
                disabled={!isAuthenticated || isClosed}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border px-3 py-2 text-left transition-colors',
                  isPicked
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                  (!isAuthenticated || isClosed) &&
                    'cursor-not-allowed opacity-60',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{option.label}</span>
                  {isPicked ? (
                    <span className="text-xs uppercase tracking-wide">
                      Mon pari
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    isPicked ? 'text-background/80' : 'text-muted-foreground',
                  )}
                >
                  {sharePct}% · {option.bet_count} pari
                  {option.bet_count > 1 ? 's' : ''}
                  {option.odds !== null ? ` · cote ×${option.odds}` : ''}
                </span>
              </button>
            );
          })}
      </div>

      {!isAuthenticated ? (
        <p className="text-xs text-muted-foreground">
          <AppButton variant="ghost" href="/auth/login">
            Connectez-vous
          </AppButton>
          pour parier.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

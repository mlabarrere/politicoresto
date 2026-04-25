import Link from 'next/link';
import type { Route } from 'next';
import { EmptyState } from '@/components/layout/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PronoCardInline } from '@/components/prono/prono-card-inline';
import {
  getPronoList,
  type PronoListSort,
  type PronoListStatus,
} from '@/lib/data/public/pronos';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Pronostics — PoliticoResto',
  description:
    'Pronostics politiques ouverts : pariez sur les options proposées par la communauté et validées par PoliticoResto.',
};

const STATUS_OPTIONS: { value: PronoListStatus; label: string }[] = [
  { value: 'open', label: 'Actifs' },
  { value: 'resolved', label: 'Résolus' },
  { value: 'mine', label: 'Mes pronos' },
];

const SORT_OPTIONS: { value: PronoListSort; label: string }[] = [
  { value: 'activity', label: 'Activité' },
  { value: 'panel', label: 'Taille du panel' },
  { value: 'recent', label: 'Récents' },
];

function parseStatus(value: string | undefined): PronoListStatus {
  return value === 'resolved' || value === 'mine' ? value : 'open';
}

function parseSort(value: string | undefined): PronoListSort {
  return value === 'panel' || value === 'recent' ? value : 'activity';
}

export default async function PronosListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const sort = parseSort(params.sort);

  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  const summaries = await getPronoList({
    status,
    sort,
    userId,
    supabase,
    limit: 50,
  });

  const hrefFor = (next: { status?: PronoListStatus; sort?: PronoListSort }) =>
    `/pronos?status=${next.status ?? status}&sort=${next.sort ?? sort}` as Route;

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pronostics
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pronostics ({summaries.length})
          </h1>
          <p className="text-sm text-muted-foreground">
            Pariez sur les questions ouvertes. Multiplicateur sentinelle révélé
            à la résolution. Sans argent, juste pour le classement.
          </p>
        </header>

        <div className="flex flex-wrap gap-2 text-xs">
          {STATUS_OPTIONS.map((option) => {
            const active = option.value === status;
            const disabled = option.value === 'mine' && !userId;
            if (disabled) {
              return (
                <span
                  key={option.value}
                  className="cursor-not-allowed rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground/60"
                  title="Connectez-vous pour voir vos pronos"
                >
                  {option.label}
                </span>
              );
            }
            return (
              <Link
                key={option.value}
                href={hrefFor({ status: option.value })}
                className={cn(
                  'rounded-full border px-3 py-1 transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                )}
                aria-pressed={active}
              >
                {option.label}
              </Link>
            );
          })}
          <span aria-hidden className="mx-1 text-muted-foreground">
            ·
          </span>
          {SORT_OPTIONS.map((option) => {
            const active = option.value === sort;
            return (
              <Link
                key={option.value}
                href={hrefFor({ sort: option.value })}
                className={cn(
                  'rounded-full border px-3 py-1 transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                )}
                aria-pressed={active}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        {summaries.length === 0 ? (
          <EmptyState
            title={
              status === 'mine'
                ? 'Aucun de vos paris ne correspond'
                : status === 'resolved'
                  ? 'Aucun pronostic résolu'
                  : 'Aucun pronostic ouvert'
            }
            body="Les nouveaux pronostics apparaîtront ici dès que PoliticoResto en validera."
          />
        ) : (
          <div className="space-y-3">
            {summaries.map((summary) => (
              <PronoCardInline key={summary.question_id} summary={summary} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

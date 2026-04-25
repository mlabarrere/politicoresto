import Link from 'next/link';
import { AppCard } from '@/components/app/app-card';
import { EmptyState } from '@/components/layout/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { requireSession } from '@/lib/guards/require-session';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata = { title: 'Mes pronostics — PoliticoResto' };

interface HistoryRow {
  question_id: string;
  topic_id: string;
  topic_slug: string;
  title: string;
  option_label: string;
  bet_at: string;
  is_pruned: boolean;
  resolution_kind: 'resolved' | 'voided' | null;
  resolved_at: string | null;
  was_correct: boolean | null;
  points_earned: number | null;
  multiplier: number | null;
}

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function MyPronosPage() {
  await requireSession('/me/pronos');
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return (
      <PageContainer>
        <EmptyState
          title="Session expirée"
          body="Reconnectez-vous pour consulter votre historique."
        />
      </PageContainer>
    );
  }

  const { data, error } = await supabase
    .from('v_prono_user_history')
    .select(
      'question_id, topic_id, topic_slug, title, option_label, bet_at, is_pruned, resolution_kind, resolved_at, was_correct, points_earned, multiplier',
    )
    .eq('user_id', userId)
    .order('bet_at', { ascending: false });
  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title="Historique indisponible"
          body={`Erreur SQL : ${error.message}`}
        />
      </PageContainer>
    );
  }
  const rows = (data ?? []) as HistoryRow[];

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Profil
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Mes pronostics
          </h1>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucun pari"
            body="Pariez sur un pronostic ouvert pour le voir apparaître ici."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <Link
                key={`${row.question_id}-${row.option_label}`}
                href={`/post/${row.topic_slug}`}
                className="block"
              >
                <AppCard className="space-y-1 transition-colors hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-medium text-foreground">
                      {row.title}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {formatDateFr(row.bet_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pari : {row.option_label}
                    {row.is_pruned ? ' · ignoré (post-cutoff)' : ''}
                  </p>
                  {row.resolution_kind === 'resolved' ? (
                    <p
                      className={
                        row.was_correct
                          ? 'text-sm text-emerald-700'
                          : 'text-sm text-muted-foreground'
                      }
                    >
                      {row.was_correct
                        ? `+${row.points_earned ?? 0} points · ×${row.multiplier?.toFixed(1) ?? '1.0'}`
                        : 'Mauvais pari'}
                    </p>
                  ) : null}
                  {row.resolution_kind === 'voided' ? (
                    <p className="text-sm text-amber-700">Pronostic annulé</p>
                  ) : null}
                  {row.resolution_kind === null ? (
                    <p className="text-sm text-muted-foreground">
                      En attente de résolution
                    </p>
                  ) : null}
                </AppCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

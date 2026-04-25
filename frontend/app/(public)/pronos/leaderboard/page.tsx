import { AppCard } from '@/components/app/app-card';
import { EmptyState } from '@/components/layout/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Classement — Pronostics PoliticoResto',
};

interface LeaderboardRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  total_score: number;
  total_max_possible: number;
  precision_pct: number;
  bets_count: number;
  wins_count: number;
  rank: number;
}

export default async function PronosLeaderboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('v_prono_leaderboard')
    .select('*');
  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title="Classement indisponible"
          body={`Erreur SQL : ${error.message}`}
        />
      </PageContainer>
    );
  }
  const rows = (data ?? []) as LeaderboardRow[];

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pronostics
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Classement
          </h1>
          <p className="text-sm text-muted-foreground">
            Précision moyenne = (points gagnés) / (max théorique si tous les
            paris étaient corrects au plafond ×5).
          </p>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucun classement"
            body="Le classement apparaîtra ici dès que des pronostics auront été résolus."
          />
        ) : (
          <AppCard className="divide-y divide-border p-0">
            {rows.map((row) => (
              <div
                key={row.user_id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="w-8 text-muted-foreground">#{row.rank}</span>
                <span className="flex-1 font-medium text-foreground">
                  {row.username ?? row.display_name ?? 'Anonyme'}
                </span>
                <span className="text-muted-foreground">
                  {row.wins_count}/{row.bets_count}
                </span>
                <span className="text-foreground">
                  {row.precision_pct.toFixed(1)}%
                </span>
                <span className="w-14 text-right font-semibold text-foreground">
                  {row.total_score} pts
                </span>
              </div>
            ))}
          </AppCard>
        )}
      </div>
    </PageContainer>
  );
}

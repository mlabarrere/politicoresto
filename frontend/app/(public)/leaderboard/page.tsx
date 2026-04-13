import { PageContainer } from "@/components/layout/page-container";
import { LeaderboardCard } from "@/components/scores/leaderboard-card";
import { getGlobalLeaderboard } from "@/lib/data/public/leaderboards";

export default async function LeaderboardPage() {
  const rows = await getGlobalLeaderboard(24);

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-3xl border border-border bg-card p-6">
          <p className="eyebrow">Classements</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
            Analystes globaux
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Score global + activité visible + justesse analytique.
          </p>
        </section>

        <LeaderboardCard title="Global" rows={rows} />
      </div>
    </PageContainer>
  );
}

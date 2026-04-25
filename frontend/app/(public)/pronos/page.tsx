import { EmptyState } from '@/components/layout/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PronoCardInline } from '@/components/prono/prono-card-inline';
import { getOpenPronos } from '@/lib/data/public/pronos';

export const metadata = {
  title: 'Pronostics — PoliticoResto',
  description:
    'Pronostics politiques ouverts : pariez sur les options proposées par la communauté et validées par PoliticoResto.',
};

export default async function PronosListPage() {
  const summaries = await getOpenPronos({ limit: 50 });

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pronostics
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pronostics ouverts ({summaries.length})
          </h1>
          <p className="text-sm text-muted-foreground">
            Pariez sur les questions ouvertes. Multiplicateur sentinelle révélé
            à la résolution. Sans argent, juste pour le classement.
          </p>
        </header>

        {summaries.length === 0 ? (
          <EmptyState
            title="Aucun pronostic ouvert"
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

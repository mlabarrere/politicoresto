import { PollExplorerList } from "@/components/poll/poll-explorer-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { getPollExplorerRows } from "@/lib/data/public/polls";

export default async function PollsPage() {
  let rows = [] as Awaited<ReturnType<typeof getPollExplorerRows>>;
  let error: string | null = null;

  try {
    rows = await getPollExplorerRows();
  } catch (nextError) {
    error = nextError instanceof Error ? nextError.message : "Lecture impossible";
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="app-card px-4 py-3">
          <p className="text-sm font-medium text-foreground">Sondages publics</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Resultat brut, estimation corrigee, score de representativite.
          </p>
        </section>

        {error ? <EmptyState title="Lecture partielle" body={error} /> : null}
        <PollExplorerList rows={rows} />
      </div>
    </PageContainer>
  );
}

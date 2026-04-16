import { PollExplorerList } from "@/components/poll/poll-explorer-list";
import { AppPageHeader } from "@/components/app/app-page-header";
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
        <AppPageHeader
          eyebrow="Sondages"
          title="Sondages publics"
          description="Resultat brut, estimation corrigee, score de representativite."
        />

        {error ? <EmptyState title="Lecture partielle" body={error} /> : null}
        <PollExplorerList rows={rows} />
      </div>
    </PageContainer>
  );
}

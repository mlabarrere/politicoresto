import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";

export default function PollNotFound() {
  return (
    <PageContainer>
      <EmptyState
        title="Sondage introuvable"
        body="Ce sondage n’existe pas ou n’est pas accessible publiquement."
      />
    </PageContainer>
  );
}

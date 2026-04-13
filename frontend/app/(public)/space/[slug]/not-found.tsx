import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";

export default function SpaceNotFound() {
  return (
    <PageContainer>
      <EmptyState
        title="Espace introuvable"
        body="Cet espace n’existe pas ou n’est pas visible publiquement."
      />
    </PageContainer>
  );
}

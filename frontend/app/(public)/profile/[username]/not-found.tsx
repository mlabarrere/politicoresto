import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";

export default function PublicProfileNotFound() {
  return (
    <PageContainer>
      <EmptyState
        title="Profil introuvable"
        body="Aucun profil public ne correspond à cet identifiant ou le contrat de vue backend ne permet pas encore de l’exposer."
      />
    </PageContainer>
  );
}

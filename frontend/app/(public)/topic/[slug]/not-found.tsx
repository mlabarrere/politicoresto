import { PageContainer } from "@/components/layout/page-container";
import { ScreenState } from "@/components/layout/screen-state";

export default function TopicNotFound() {
  return (
    <PageContainer>
      <ScreenState
        title="Sujet introuvable"
        body="Ce sujet n'est pas expose publiquement, ou son slug ne correspond a aucune entree visible."
        actionHref="/topics"
        actionLabel="Voir tous les sujets"
      />
    </PageContainer>
  );
}

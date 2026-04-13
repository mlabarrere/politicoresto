import { PageContainer } from "@/components/layout/page-container";
import { ScreenState } from "@/components/layout/screen-state";
import type { Route } from "next";

export default function ThreadNotFound() {
  return (
    <PageContainer>
      <ScreenState
        title="Thread introuvable"
        body="Ce thread n'est pas expose publiquement, ou son slug ne correspond a aucune entree visible."
        actionHref={"/threads" as Route}
        actionLabel="Voir tous les threads"
      />
    </PageContainer>
  );
}

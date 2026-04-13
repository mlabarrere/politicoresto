import { PageContainer } from "@/components/layout/page-container";
import { ScreenState } from "@/components/layout/screen-state";

export default function NotFound() {
  return (
    <PageContainer>
      <ScreenState
        title="Page introuvable"
        body="La page que vous cherchez n'est pas disponible ou n'existe plus."
        actionHref="/"
        actionLabel="Retour a l'accueil"
      />
    </PageContainer>
  );
}

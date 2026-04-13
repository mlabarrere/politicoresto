import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";

export default function LoadingSpaceDetail() {
  return (
    <PageContainer>
      <SectionCard title="Chargement de l’espace" eyebrow="Public">
        <p className="text-sm text-muted-foreground">Préparation des informations publiques de l’espace.</p>
      </SectionCard>
    </PageContainer>
  );
}

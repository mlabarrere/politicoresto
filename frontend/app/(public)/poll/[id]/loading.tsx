import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";

export default function LoadingPollDetail() {
  return (
    <PageContainer>
      <SectionCard title="Chargement du sondage" eyebrow="Public">
        <p className="text-sm text-muted-foreground">Préparation des questions et résultats publics.</p>
      </SectionCard>
    </PageContainer>
  );
}

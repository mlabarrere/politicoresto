import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";

export default function LoadingPublicProfile() {
  return (
    <PageContainer>
      <SectionCard title="Chargement du profil" eyebrow="Public">
        <p className="text-sm text-muted-foreground">Récupération du profil public en cours.</p>
      </SectionCard>
    </PageContainer>
  );
}

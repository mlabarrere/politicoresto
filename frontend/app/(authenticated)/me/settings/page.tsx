import { recordPublicProfileConsent } from "@/lib/data/rpc/consent";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/layout/section-card";

export default async function MeSettingsPage() {
  return (
    <SectionCard title="Paramètres du profil" eyebrow="Authentifié">
      <div className="space-y-4">
        <p className="text-sm leading-7 text-muted-foreground">
          Cette vue prépare les futurs réglages de visibilité, consentements et
          préférences publiques. Le frontend ne décide pas des règles; il
          délègue l’écriture aux RPC Supabase.
        </p>
        <form action={recordPublicProfileConsent}>
          <Button type="submit" variant="secondary">
            Enregistrer un consentement de visibilité publique
          </Button>
        </form>
      </div>
    </SectionCard>
  );
}

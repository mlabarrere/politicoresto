import { notFound } from "next/navigation";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { getPublicProfileByUsername } from "@/lib/data/public/profiles";
import { formatDate } from "@/lib/utils/format";

export default async function PublicProfilePage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const result = await getPublicProfileByUsername(username);

  if (!result?.profile) {
    notFound();
  }

  const profile = result.profile;

  return (
    <PageContainer>
      <SectionCard title={profile.display_name ?? username} eyebrow="Profil public">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-muted-foreground">
            {profile.bio ?? "Aucune biographie publique disponible pour ce profil."}
          </p>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-foreground">Territoire public</dt>
              <dd className="mt-1 text-muted-foreground">
                {profile.public_territory_id ?? "Non expose"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Visible depuis</dt>
              <dd className="mt-1 text-muted-foreground">{formatDate(profile.created_at)}</dd>
            </div>
          </dl>
          <EmptyState
            title="Contrat backend encore minimal"
            body="La vue publique actuelle ne fournit pas encore l'integralite des attributs attendus pour un profil editorial riche."
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

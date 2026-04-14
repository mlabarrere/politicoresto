import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import { SectionCard } from "@/components/layout/section-card";
import { getVaultSettingsData } from "@/lib/data/authenticated/vault";

export default async function MePage() {
  const data = await getVaultSettingsData();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Mon profil" eyebrow="Prive">
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            Cet espace est personnel. Il vous permet de garder une trace courte de votre parcours
            politique et de vos notes privees.
          </p>
          <p>
            Les elements avances de sondage ne sont pas au coeur du MVP et pourront arriver plus tard.
          </p>
          <Link
            href="/me/settings"
            className="inline-flex rounded-full border border-border bg-background px-4 py-2 font-medium text-foreground transition hover:bg-muted"
          >
            Modifier mon profil
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Apercu prive" eyebrow="Mon espace">
        {data.profile?.notes_private ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{data.profile.notes_private}</p>
        ) : (
          <EmptyState
            title="Aucune note pour le moment"
            body="Ajoutez une courte histoire personnelle dans les parametres de profil."
          />
        )}
      </SectionCard>

      {data.error ? (
        <div className="lg:col-span-2">
          <EmptyState title="Lecture partielle" body={`Une partie de votre espace reste indisponible: ${data.error}`} />
        </div>
      ) : null}
    </div>
  );
}

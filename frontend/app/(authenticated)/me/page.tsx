import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import { SectionCard } from "@/components/layout/section-card";
import { getMeDashboardData } from "@/lib/data/authenticated/me";
import { formatDate, formatNumber } from "@/lib/utils/format";

export default async function MePage() {
  const { data, error } = await getMeDashboardData();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <SectionCard title="Reputation" eyebrow="Mon profil">
        {data.reputation ? (
          <div className="space-y-2">
            <p className="text-5xl font-semibold tracking-tight text-foreground">
              {formatNumber(data.reputation.total_reputation)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatNumber(data.reputation.event_count)} evenements pris en compte
            </p>
          </div>
        ) : (
          <EmptyState
            title="Votre reputation apparaitra ici"
            body="Elle se remplit au fil des retours, des commentaires et des sondages."
          />
        )}
      </SectionCard>

      <SectionCard title="Historique electoral" eyebrow="Vault prive">
        {data.privateHistory.length ? (
          <div className="space-y-3">
            {data.privateHistory.slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border bg-background p-4 text-sm">
                <p className="font-semibold text-foreground">{entry.declared_option_label}</p>
                <p className="mt-1 text-muted-foreground">
                  Tour {entry.vote_round ?? "?"} | {entry.declared_candidate_name ?? "Candidat non renseigne"}
                </p>
                <p className="mt-1 text-muted-foreground">Enregistre: {formatDate(entry.declared_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucune entree privee"
            body="Vos premieres positions privees apparaitront ici apres consentement et saisie."
          />
        )}
      </SectionCard>

      <SectionCard title="Confidentialite" eyebrow="Mon profil">
        <div className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            Les donnees sensibles restent separees du feed public. Elles servent au traitement
            statistique futur, pas a l'affichage public.
          </p>
          <p>Vous gardez la main sur vos informations privees et vos consentements.</p>
          <Link
            href="/me/settings"
            className="inline-flex rounded-full border border-border bg-background px-4 py-2 font-medium text-foreground transition hover:bg-muted"
          >
            Gerer le vault
          </Link>
        </div>
      </SectionCard>

      {error ? (
        <div className="lg:col-span-3">
          <EmptyState
            title="Lecture partielle"
            body={`Une partie de votre espace reste indisponible: ${error}`}
          />
        </div>
      ) : null}
    </div>
  );
}

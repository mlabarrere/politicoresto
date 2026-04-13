import { EmptyState } from "@/components/layout/empty-state";
import { SectionCard } from "@/components/layout/section-card";
import { getMeDashboardData } from "@/lib/data/authenticated/me";
import { formatNumber } from "@/lib/utils/format";

export default async function MePage() {
  const { data, error } = await getMeDashboardData();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <SectionCard title="Ma reputation" eyebrow="Vue d'ensemble">
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
            body="Elle se remplira au fil des resultats et des evenements visibles."
          />
        )}
      </SectionCard>

      <SectionCard title="Mes cartes" eyebrow="Collection">
        {data.cards.length ? (
          <div className="space-y-2">
            <p className="text-5xl font-semibold tracking-tight text-foreground">
              {formatNumber(data.cards.length)}
            </p>
            <p className="text-sm text-muted-foreground">cartes visibles dans votre espace</p>
          </div>
        ) : (
          <EmptyState
            title="Pas encore de cartes"
            body="Vos premieres cartes apparaitront a mesure que vous suivrez des sujets."
          />
        )}
      </SectionCard>

      <SectionCard title="Mes participations" eyebrow="Activite">
        {data.predictions.length ? (
          <div className="space-y-2">
            <p className="text-5xl font-semibold tracking-tight text-foreground">
              {formatNumber(data.predictions.length)}
            </p>
            <p className="text-sm text-muted-foreground">entrees deja visibles dans votre historique</p>
          </div>
        ) : (
          <EmptyState
            title="Pas encore de participation"
            body="Votre espace prendra forme des vos premiers sujets suivis."
          />
        )}
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

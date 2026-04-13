import { EmptyState } from "@/components/layout/empty-state";
import { SectionCard } from "@/components/layout/section-card";
import { getMyReputationSummary } from "@/lib/data/authenticated/me";
import { formatNumber } from "@/lib/utils/format";

export default async function MeReputationPage() {
  const { data, error } = await getMyReputationSummary();

  return (
    <SectionCard title="Reputation" eyebrow="Historique consolide">
      {error ? (
        <EmptyState
          title="Reputation indisponible"
          body={`La vue de reputation n'a pas pu etre lue: ${error}`}
        />
      ) : data ? (
        <div className="space-y-3">
          <p className="text-5xl font-semibold tracking-tight text-foreground">
            {formatNumber(data.total_reputation)}
          </p>
          <p className="text-sm text-muted-foreground">
            Total d'evenements visibles: {formatNumber(data.event_count)}
          </p>
        </div>
      ) : (
        <EmptyState
          title="Aucune reputation calculee"
          body="Votre score apparaitra ici des que le backend remontera un historique consolide."
        />
      )}
    </SectionCard>
  );
}

import { EmptyState } from "@/components/layout/empty-state";
import { SectionCard } from "@/components/layout/section-card";
import { getMyPredictionHistory } from "@/lib/data/authenticated/me";
import { formatDate } from "@/lib/utils/format";

export default async function MePredictionsPage() {
  const { data, error } = await getMyPredictionHistory();

  return (
    <SectionCard title="Mes predictions" eyebrow="Historique personnel">
      {error ? (
        <EmptyState
          title="Historique indisponible"
          body={`La vue authentifiee n'a pas pu etre lue: ${error}`}
        />
      ) : data.length ? (
        <div className="space-y-3">
          {data.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border bg-background p-5 text-sm">
              <p className="font-semibold text-foreground">Topic {entry.topic_id}</p>
              <p className="mt-2 text-muted-foreground">Statut: {entry.submission_status}</p>
              <p className="mt-2 text-muted-foreground">Enregistre: {formatDate(entry.recorded_at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucune prediction visible"
          body="L'historique personnel apparaitra ici des vos premieres positions."
        />
      )}
    </SectionCard>
  );
}

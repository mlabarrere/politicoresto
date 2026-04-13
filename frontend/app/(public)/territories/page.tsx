import { MapPinned, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { getTerritoriesScreenData } from "@/lib/data/public/territories";
import { formatNumber } from "@/lib/utils/format";

export default async function TerritoriesPage() {
  const { data, error } = await getTerritoriesScreenData();

  return (
    <PageContainer>
      <div className="space-y-8">
        <section className="soft-panel p-6 sm:p-8">
          <p className="eyebrow">Territoires</p>
          <h1 className="editorial-title mt-3 text-4xl font-bold text-foreground">Territoires</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Cette page aide a reperer ou les sujets sont les plus presents et ou l'activite se concentre.
          </p>
        </section>

        {error ? (
          <EmptyState
            title="Lecture territoriale partielle"
            body={`Certaines donnees territoriales ne sont pas encore disponibles: ${error}`}
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Sujets par territoire" eyebrow="Volume" aside={<MapPinned className="size-5 text-sky-700" />}>
            {data.topicRollups.length ? (
              <div className="space-y-3">
                {data.topicRollups.map((item) => (
                  <div
                    key={item.territory_id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{item.territory_id}</span>
                    <span className="font-semibold text-foreground">{formatNumber(item.topic_count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Les sujets territoriaux apparaitront ici"
                body="Les premiers volumes par territoire seront visibles ici des que les donnees remonteront."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Activite par territoire"
            eyebrow="Participations"
            aside={<TrendingUp className="size-5 text-primary" />}
          >
            {data.predictionRollups.length ? (
              <div className="space-y-3">
                {data.predictionRollups.map((item) => (
                  <div
                    key={item.territory_id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{item.territory_id}</span>
                    <span className="font-semibold text-foreground">
                      {formatNumber(item.prediction_count)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="L'activite apparaitra ici"
                body="Cette colonne affichera la participation visible par territoire."
              />
            )}
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}

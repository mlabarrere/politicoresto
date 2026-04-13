import Link from "next/link";
import { ArrowDownWideNarrow, SlidersHorizontal } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTopicsScreenData } from "@/lib/data/public/topics";
import { formatDate, formatNumber } from "@/lib/utils/format";

export default async function TopicsPage() {
  const { data, error } = await getTopicsScreenData();

  return (
    <PageContainer>
      <div className="space-y-8">
        <section className="soft-panel p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="eyebrow">Sujets</p>
              <h1 className="editorial-title text-4xl font-bold text-foreground">Tous les sujets</h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Retrouvez les sujets publics par date, par etat et par niveau d'activite.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2">
                <SlidersHorizontal className="size-4" />
                Filtres
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2">
                <ArrowDownWideNarrow className="size-4" />
                Plus recents
              </span>
            </div>
          </div>
        </section>

        <SectionCard title="Liste des sujets" eyebrow={`${data.topics.length} sujets visibles`}>
          {error ? (
            <div className="mb-5">
              <EmptyState
                title="Lecture partielle"
                body={`Certaines donnees ne sont pas encore completes: ${error}`}
              />
            </div>
          ) : null}

          {data.topics.length ? (
            <ul className="grid gap-4">
              {data.topics.map((topic) => (
                <li key={topic.id} className="rounded-lg border border-border bg-background p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={topic.topic_status} tone="default" />
                        {topic.primary_territory_id ? (
                          <StatusBadge label="Territoire" tone="info" />
                        ) : null}
                      </div>
                      <Link
                        href={`/topic/${topic.slug}`}
                        className="block text-xl font-semibold tracking-tight text-foreground transition hover:text-primary"
                      >
                        {topic.title}
                      </Link>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        {topic.description ?? "Sujet public pret a etre consulte."}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground lg:min-w-[250px]">
                      <p>Ouvert le {formatDate(topic.open_at)}</p>
                      <p>Messages visibles: {formatNumber(topic.visible_post_count ?? 0)}</p>
                      <p>
                        Participations:{" "}
                        {formatNumber(
                          topic.aggregate?.submission_count ?? topic.active_prediction_count ?? 0
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Aucun sujet visible pour le moment"
              body="Les sujets publics apparaitront ici des qu'ils seront disponibles."
            />
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

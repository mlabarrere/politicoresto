import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSpacesScreenData } from "@/lib/data/public/spaces";
import { formatDate } from "@/lib/utils/format";

export default async function SpacesPage() {
  const { data, error } = await getSpacesScreenData();

  return (
    <PageContainer>
      <div className="space-y-8">
        <section className="soft-panel p-6 sm:p-8">
          <p className="eyebrow">Espaces</p>
          <h1 className="editorial-title mt-3 text-4xl font-bold text-foreground">Les espaces politiques</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Le feed global coexiste ici avec des espaces de camp, de bloc et de suivi politique.
          </p>
        </section>

        <SectionCard title="Tous les espaces" eyebrow={`${data.spaces.length} espaces`}>
          {error ? (
            <div className="mb-5">
              <EmptyState
                title="Lecture partielle"
                body={`Certains espaces restent indisponibles: ${error}`}
              />
            </div>
          ) : null}
          {data.spaces.length ? (
            <ul className="grid gap-4 lg:grid-cols-2">
              {data.spaces.map((space) => (
                <li key={space.id} className="rounded-lg border border-border bg-background p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl font-semibold tracking-tight text-foreground">{space.name}</p>
                    <StatusBadge label={space.space_type} tone="accent" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {space.description ?? "Espace public pret a rassembler ses premiers threads."}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Publie le {formatDate(space.created_at)}</span>
                    <Link href={`/space/${space.slug}`} className="font-semibold text-primary">
                      Ouvrir l'espace
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Aucun espace visible pour le moment"
              body="Les espaces apparaitront ici des qu'ils seront disponibles."
            />
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

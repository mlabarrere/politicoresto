import { notFound } from "next/navigation";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSpaceDetail } from "@/lib/data/public/spaces";

export default async function SpaceDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getSpaceDetail(slug);

  if (!detail?.space) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionCard
          title={detail.space.name}
          eyebrow="Espace"
          aside={<StatusBadge label={detail.space.space_type} />}
        >
          <p className="text-sm leading-7 text-muted-foreground">
            {detail.space.description ?? "Aucune description editoriale disponible."}
          </p>
        </SectionCard>

        <SectionCard title="Sujets de l'espace" eyebrow="Flux">
          {detail.topics.length ? (
            <ul className="space-y-3">
              {detail.topics.map((topic) => (
                <li key={topic.id} className="rounded-lg border border-border bg-background p-4">
                  <p className="font-semibold text-foreground">{topic.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topic.description ?? "Sujet sans description publique."}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Aucun sujet visible"
              body="L'espace est publie, mais aucun sujet public n'y est encore expose."
            />
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

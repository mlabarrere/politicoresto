import { notFound } from "next/navigation";
import { Clock3, Layers3, MessagesSquare, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTopicDetail } from "@/lib/data/public/topics";
import { formatDate, formatNumber } from "@/lib/utils/format";

export default async function TopicDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getTopicDetail(slug);

  if (!detail?.topic) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <div className="space-y-6">
          <section className="soft-panel p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={detail.topic.topic_status} tone="default" />
              <StatusBadge label={detail.topic.visibility} tone="muted" />
            </div>
            <h1 className="editorial-title mt-4 text-4xl font-bold text-foreground">
              {detail.topic.title}
            </h1>
            <p className="mt-4 max-w-4xl text-base leading-7 text-muted-foreground">
              {detail.topic.description ?? "Aucune description publique detaillee pour ce sujet."}
            </p>
            <div className="mt-6 grid gap-4 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <p className="eyebrow">Ouverture</p>
                <p className="mt-2 font-semibold text-foreground">{formatDate(detail.topic.open_at)}</p>
              </div>
              <div>
                <p className="eyebrow">Cloture</p>
                <p className="mt-2 font-semibold text-foreground">{formatDate(detail.topic.close_at)}</p>
              </div>
              <div>
                <p className="eyebrow">Visibilite</p>
                <p className="mt-2 font-semibold text-foreground">{detail.topic.visibility}</p>
              </div>
            </div>
          </section>

          <SectionCard title="Question" eyebrow="A suivre">
            {detail.question ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-border bg-muted/60 p-5">
                  <p className="eyebrow">Question principale</p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-foreground">
                    {detail.question.title}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="eyebrow">Type</p>
                    <p className="mt-2 font-semibold text-foreground">{detail.question.prediction_type}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="eyebrow">Mises a jour</p>
                    <p className="mt-2 font-semibold text-foreground">
                      {detail.question.allow_submission_update ? "Autorisees" : "Figees"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="eyebrow">Participations</p>
                    <p className="mt-2 font-semibold text-foreground">
                      {formatNumber(detail.aggregate?.submission_count ?? 0)}
                    </p>
                  </div>
                </div>
                {detail.options.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detail.options.map((option) => (
                      <div
                        key={option.id}
                        className="rounded-lg border border-border bg-background p-4 text-sm text-foreground"
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="La question n'est pas encore disponible"
                body="Le sujet est visible, mais sa question complete n'est pas encore exposee ici."
              />
            )}
          </SectionCard>

          <SectionCard title="Discussion" eyebrow="Messages">
            {detail.posts.length ? (
              <div className="space-y-4">
                {detail.posts.map((post) => (
                  <article key={post.id} className="rounded-lg border border-border bg-background p-5">
                    <p className="font-semibold text-foreground">
                      {post.title ?? "Message sans titre"}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{post.body_markdown}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="La discussion apparaitra ici"
                body="Le sujet est deja visible, mais aucun message public n'est encore rattache."
              />
            )}
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="En bref" eyebrow="Infos utiles">
            <div className="grid gap-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <Sparkles className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">
                    {formatNumber(detail.aggregate?.submission_count ?? 0)} participations
                  </p>
                  <p>Participation visible</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MessagesSquare className="mt-0.5 size-4 text-sky-700" />
                <div>
                  <p className="font-semibold text-foreground">
                    {formatNumber(detail.posts.length)} messages visibles
                  </p>
                  <p>Discussion liee au sujet</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 size-4 text-amber-700" />
                <div>
                  <p className="font-semibold text-foreground">{formatDate(detail.topic.close_at)}</p>
                  <p>Prochaine date utile</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Ce sujet en clair" eyebrow="Contexte">
            <div className="flex gap-3 text-sm text-muted-foreground">
              <Layers3 className="mt-0.5 size-4 text-primary" />
              <p>
                Le sujet reste au centre. Les messages servent a documenter et a clarifier sa lecture.
              </p>
            </div>
          </SectionCard>
        </aside>
      </div>
    </PageContainer>
  );
}

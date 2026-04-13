import { notFound } from "next/navigation";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPollDetail } from "@/lib/data/public/polls";
import { formatDate, formatNumber } from "@/lib/utils/format";

export default async function PollDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPollDetail(id);

  if (!detail?.poll) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionCard
          title={detail.poll.title}
          eyebrow="Sondage"
          aside={<StatusBadge label={detail.poll.poll_status} />}
        >
          <p className="text-sm leading-7 text-muted-foreground">
            {detail.poll.description ?? "Aucune description publique du sondage."}
          </p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <p>Ouverture: {formatDate(detail.poll.open_at)}</p>
            <p>Cloture: {formatDate(detail.poll.close_at)}</p>
          </div>
        </SectionCard>

        <SectionCard title="Questions" eyebrow="Resultats publics">
          {detail.questions.length ? (
            <div className="space-y-6">
              {detail.questions.map((question) => (
                <article key={question.id} className="rounded-lg border border-border bg-background p-4">
                  <p className="font-semibold text-foreground">{question.prompt}</p>
                  {question.options.length ? (
                    <ul className="mt-3 space-y-2">
                      {question.options.map((option) => {
                        const result = question.results.find(
                          (entry) => entry.poll_option_id === option.id
                        );

                        return (
                          <li key={option.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">{option.label}</span>
                            <span className="font-semibold text-foreground">
                              {formatNumber(result?.response_count ?? 0)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <EmptyState
                      title="Options absentes"
                      body="La question existe, mais aucune option publique n'est encore exposee."
                    />
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucune question visible"
              body="Le sondage existe, mais sa structure n'est pas encore exposee."
            />
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

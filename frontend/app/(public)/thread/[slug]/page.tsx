import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";

import { BetCard } from "@/components/feed/bet-card";
import { PollCard } from "@/components/feed/poll-card";
import { createThreadPostAction } from "@/lib/actions/threads";
import { CommentList } from "@/components/comments/comment-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { LeaderboardCard } from "@/components/scores/leaderboard-card";
import { ScoreBadge } from "@/components/scores/score-badge";
import { ReactionBar } from "@/components/social/reaction-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { getThreadDetail } from "@/lib/data/public/threads";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils/format";

export default async function ThreadDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getThreadDetail(slug);

  if (!detail?.thread) {
    notFound();
  }
  const thread = detail.thread;

  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const primaryThreadPost = detail.threadPosts[0] ?? null;
  const marketThreadPost = detail.threadPosts.find((item) => item.type === "market") ?? primaryThreadPost;

  return (
    <PageContainer>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={thread.topic_status} tone="default" />
              {thread.visibility ? <StatusBadge label={thread.visibility} tone="muted" /> : null}
              {detail.question?.prediction_type ? (
                <StatusBadge label={detail.question.prediction_type} tone="accent" />
              ) : null}
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
              {thread.title}
            </h1>
            {thread.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                {thread.description}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <ScoreBadge label="Paris" value={formatNumber(detail.aggregate?.submission_count ?? 0)} />
              <ScoreBadge label="Blocs" value={formatNumber(detail.threadPosts.length)} />
              <ScoreBadge label="Commentaires" value={formatNumber(detail.comments.length)} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="eyebrow">Ouverture</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatDate(thread.open_at)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="eyebrow">Cloture</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatDate(thread.close_at)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="eyebrow">Activite</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatNumber(detail.comments.length + detail.threadPosts.length)}</p>
              </div>
            </div>
          </section>

          {detail.threadPosts.length ? (
            <section className="space-y-4">
              {detail.threadPosts.map((post) => (
                <article key={post.id} className="rounded-3xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={post.type} tone="muted" />
                      {post.entity_name ? <StatusBadge label={post.entity_name} tone="info" /> : null}
                    </div>
                    <ReactionBar
                      targetType="thread_post"
                      targetId={post.id}
                      redirectPath={`/thread/${thread.slug}`}
                      upvotes={post.upvote_weight ?? 0}
                      downvotes={post.downvote_weight ?? 0}
                    />
                  </div>
                  {post.title ? <h2 className="mt-3 text-lg font-semibold text-foreground">{post.title}</h2> : null}
                  {post.content ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{post.content}</p>
                  ) : null}
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{post.display_name ?? post.username ?? "Analyste"}</span>
                    <span>{formatDate(post.created_at)}</span>
                    <span>{formatNumber(post.comment_count ?? 0)} commentaires</span>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <EmptyState title="Aucun bloc visible" body="Le thread existe, mais aucun contenu feedable n'est encore attache." />
          )}

          {detail.polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} questions={poll.questions} redirectPath={`/thread/${thread.slug}`} />
          ))}

          {detail.question ? (
            <BetCard
              threadId={thread.id}
              threadPost={marketThreadPost}
              question={detail.question as Parameters<typeof BetCard>[0]["question"]}
              options={detail.options}
              redirectPath={`/thread/${thread.slug}`}
            />
          ) : null}

          {session ? (
            <form action={createThreadPostAction} className="rounded-3xl border border-border bg-card p-4">
              <input type="hidden" name="thread_id" value={thread.id} />
              <input type="hidden" name="type" value="article" />
              <input type="hidden" name="redirect_path" value={`/thread/${thread.slug}`} />
              <p className="eyebrow">Ajouter un bloc</p>
              <input
                name="title"
                placeholder="Titre"
                className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm"
              />
              <textarea
                name="content"
                rows={4}
                placeholder="Article court. Angle. Mise en contexte."
                className="mt-3 w-full rounded-2xl border border-border px-4 py-3 text-sm"
              />
              <div className="mt-3 flex justify-end">
                <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
                  Publier un article
                </button>
              </div>
            </form>
          ) : null}

          <section className="space-y-4">
            <div>
              <p className="eyebrow">Commentaires</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Discussion</h2>
            </div>
            <CommentList
              comments={detail.comments}
              redirectPath={`/thread/${thread.slug}`}
              defaultThreadPost={primaryThreadPost}
            />
          </section>
        </main>

        <aside className="space-y-4">
          <LeaderboardCard
            title="Classement local"
            eyebrow="Analystes"
            rows={detail.localLeaderboard}
          />

          <div className="rounded-3xl border border-border bg-card p-4">
            <p className="eyebrow">Threads lies</p>
            <div className="mt-3 space-y-3">
              {detail.relatedThreads.length ? (
                detail.relatedThreads.map((item) => (
                  <Link
                    key={item.id}
                    href={`/thread/${item.slug}` as Route}
                    className="block rounded-2xl border border-border px-3 py-3 transition hover:bg-muted"
                  >
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.description ?? "Thread visible dans le meme espace."}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucun thread lie visible.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

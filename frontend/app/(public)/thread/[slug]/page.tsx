import Link from "next/link";
import { notFound } from "next/navigation";

import { CommentList } from "@/components/comments/comment-list";
import { PollCard } from "@/components/feed/poll-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { ReactionBar } from "@/components/social/reaction-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteThreadPostAction, updateThreadPostAction } from "@/lib/actions/threads";
import { createThreadPostAction } from "@/lib/actions/threads";
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
  const currentUserId = session?.user?.id ?? null;

  const primaryThreadPost = detail.threadPosts[0] ?? null;

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-4">
        <section className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={thread.topic_status} tone="default" />
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground">
            {thread.title}
          </h1>
          {thread.description ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
              {thread.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{formatNumber(detail.threadPosts.length)} posts</span>
            <span>•</span>
            <span>{formatNumber(detail.comments.length)} commentaires</span>
            <span>•</span>
            <span>Ouvert le {formatDate(thread.open_at)}</span>
          </div>
        </section>

        {detail.threadPosts.length ? (
          <section className="space-y-3">
            {detail.threadPosts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-border bg-card px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={post.type} tone="muted" />
                      {post.entity_name ? <StatusBadge label={post.entity_name} tone="info" /> : null}
                    </div>
                    {post.title ? (
                      <h2 className="mt-2 text-xl font-semibold leading-tight text-foreground">{post.title}</h2>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {post.display_name ?? post.username ?? "Analyste"} • {formatDate(post.created_at)}
                    </p>
                  </div>
                  <ReactionBar
                    targetType="thread_post"
                    targetId={post.id}
                    redirectPath={`/thread/${thread.slug}`}
                    upvotes={post.upvote_weight ?? 0}
                    downvotes={post.downvote_weight ?? 0}
                  />
                </div>

                {post.content ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/95">{post.content}</p>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{formatNumber(post.comment_count ?? 0)} commentaires</span>
                  <Link href="#reply-form" className="font-medium text-foreground hover:underline">
                    Repondre
                  </Link>
                </div>

                {currentUserId && currentUserId === post.created_by ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3">
                    <form action={updateThreadPostAction} className="space-y-2">
                      <input type="hidden" name="thread_post_id" value={post.id} />
                      <input type="hidden" name="redirect_path" value={`/thread/${thread.slug}`} />
                      <input
                        name="title"
                        defaultValue={post.title ?? ""}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                      />
                      <textarea
                        name="content"
                        defaultValue={post.content ?? ""}
                        rows={3}
                        className="w-full resize-y rounded-xl border border-border px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                      >
                        Modifier
                      </button>
                    </form>
                    <form action={deleteThreadPostAction}>
                      <input type="hidden" name="thread_post_id" value={post.id} />
                      <input type="hidden" name="redirect_path" value={`/thread/${thread.slug}`} />
                      <button
                        type="submit"
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : (
          <EmptyState title="Aucun post visible" body="Le thread existe mais aucun post n'est encore publie." />
        )}

        {detail.polls.map((poll) => (
          <PollCard key={poll.id} poll={poll} questions={poll.questions} redirectPath={`/thread/${thread.slug}`} />
        ))}

        {session ? (
          <form action={createThreadPostAction} className="rounded-2xl border border-border bg-card p-4">
            <input type="hidden" name="thread_id" value={thread.id} />
            <input type="hidden" name="type" value="article" />
            <input type="hidden" name="redirect_path" value={`/thread/${thread.slug}`} />
            <p className="text-sm font-medium text-foreground">Ajouter un post</p>
            <input
              name="title"
              placeholder="Titre"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
            <textarea
              name="content"
              rows={4}
              placeholder="Votre analyse"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
            <div className="mt-2 flex justify-end">
              <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
                Publier
              </button>
            </div>
          </form>
        ) : null}

        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Commentaires</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Discussion</h2>
          </div>
          <CommentList
            comments={detail.comments}
            redirectPath={`/thread/${thread.slug}`}
            defaultThreadPost={primaryThreadPost}
            currentUserId={currentUserId}
          />
        </section>
      </div>
    </PageContainer>
  );
}

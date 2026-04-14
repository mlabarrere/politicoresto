import { notFound } from "next/navigation";

import { CommentList } from "@/components/comments/comment-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { ReactionBar } from "@/components/social/reaction-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  deleteThreadPostAction,
  updateThreadPostAction
} from "@/lib/actions/threads";
import { getThreadDetail } from "@/lib/data/public/threads";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ThreadPostView } from "@/lib/types/views";
import { formatDate, formatNumber } from "@/lib/utils/format";

type LinkPreview = {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

function extractPreview(post: ThreadPostView | null) {
  const metadata = (post?.metadata ?? null) as Record<string, unknown> | null;
  if (!metadata) return { sourceUrl: null, preview: null as LinkPreview | null };

  const sourceUrl = typeof metadata.source_url === "string" ? metadata.source_url : null;
  const preview =
    metadata.link_preview && typeof metadata.link_preview === "object"
      ? (metadata.link_preview as LinkPreview)
      : null;

  return { sourceUrl, preview };
}

function sourceDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

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
  const op = detail.threadPosts[0] ?? null;
  const { sourceUrl, preview } = extractPreview(op);

  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id ?? null;

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Thread</Badge>
              <Badge variant="outline">{thread.topic_status}</Badge>
            </div>
            <CardTitle className="mt-2 text-3xl leading-tight">{thread.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {op?.display_name ?? op?.username ?? "Auteur"} • {formatDate(op?.created_at ?? thread.open_at)}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {op?.content ? (
              <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">{op.content}</div>
            ) : thread.description ? (
              <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">{thread.description}</div>
            ) : null}

            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-sky-300/70 bg-sky-50/70 p-3 transition hover:bg-sky-100/70"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Lien partage</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {preview?.title || sourceUrl}
                </p>
                {preview?.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preview.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-sky-700">{preview?.siteName ?? sourceDomain(sourceUrl)}</p>
              </a>
            ) : null}

            {op ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {formatNumber(op.comment_count ?? 0)} commentaires sur ce thread
                </p>
                <ReactionBar
                  targetType="thread_post"
                  targetId={op.id}
                  redirectPath={`/thread/${thread.slug}`}
                  leftVotes={op.gauche_count ?? 0}
                  rightVotes={op.droite_count ?? 0}
                />
              </div>
            ) : null}

            {op && currentUserId && currentUserId === op.created_by ? (
              <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modifier mon post d'origine</p>
                <form action={updateThreadPostAction} className="space-y-2">
                  <input type="hidden" name="thread_post_id" value={op.id} />
                  <input type="hidden" name="redirect_path" value={`/thread/${thread.slug}`} />
                  <input
                    name="title"
                    defaultValue={op.title ?? thread.title}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                  />
                  <textarea
                    name="content"
                    defaultValue={op.content ?? ""}
                    rows={5}
                    className="w-full resize-y rounded-xl border border-border px-3 py-2 text-sm leading-6"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                  >
                    Enregistrer
                  </button>
                </form>
                <form action={deleteThreadPostAction}>
                  <input type="hidden" name="thread_post_id" value={op.id} />
                  <input type="hidden" name="redirect_path" value={`/thread/${thread.slug}`} />
                  <button
                    type="submit"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    Supprimer le post d'origine
                  </button>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Separator />

        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Discussion</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Commentaires</h2>
          </div>

          {op ? (
            <CommentList
              comments={detail.comments}
              redirectPath={`/thread/${thread.slug}`}
              defaultThreadPost={op}
              currentUserId={currentUserId}
            />
          ) : (
            <EmptyState
              title="Post d'origine introuvable"
              body="Impossible de lancer la discussion sans message initial."
            />
          )}
        </section>
      </div>
    </PageContainer>
  );
}

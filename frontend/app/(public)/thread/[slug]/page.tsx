import { notFound } from "next/navigation";

import { ForumPage } from "@/components/forum/forum-page";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getThreadDetail } from "@/lib/data/public/threads";
import { buildForumCommentTree, mapThreadPostToForumPost } from "@/lib/forum/mappers";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ThreadPostView } from "@/lib/types/views";
import { formatDate } from "@/lib/utils/format";
import { normalizeMultilineText } from "@/lib/utils/multiline";

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
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser(supabase);
  const currentUserId = user?.id ?? null;
  const detail = await getThreadDetail(slug, currentUserId);

  if (!detail?.thread) {
    notFound();
  }

  const thread = detail.thread;
  const op = detail.threadPosts[0] ?? null;
  const { sourceUrl, preview } = extractPreview(op);

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
              <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">
                {normalizeMultilineText(op.content)}
              </div>
            ) : thread.description ? (
              <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">
                {normalizeMultilineText(thread.description)}
              </div>
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

          </CardContent>
        </Card>

        <Separator />

        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Discussion</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Commentaires</h2>
          </div>

          {op ? (
            <ForumPage
              post={mapThreadPostToForumPost(op)}
              comments={buildForumCommentTree(detail.comments, "top")}
              currentUserId={currentUserId}
              threadSlug={thread.slug}
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

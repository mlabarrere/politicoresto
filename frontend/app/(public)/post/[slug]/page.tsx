import { notFound } from "next/navigation";

import { ForumPage } from "@/components/forum/forum-page";
import { AppBadge } from "@/components/app/app-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { getPostDetail } from "@/lib/data/public/posts";
import { buildForumCommentTree, mapPostViewToForumPost } from "@/lib/forum/mappers";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PostDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser(supabase);
  const currentUserId = user?.id ?? null;
  const detail = await getPostDetail(slug, currentUserId);

  if (!detail?.post) {
    notFound();
  }

  const post = detail.post;
  const op = detail.posts[0] ?? null;

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <AppBadge label="Post" tone="default" />
          <AppBadge label={post.topic_status} tone="muted" />
        </div>

        {op ? (
          <ForumPage
            post={mapPostViewToForumPost(op, post.title)}
            comments={buildForumCommentTree(detail.comments, "top")}
            currentUserId={currentUserId}
            postSlug={post.slug}
          />
        ) : (
          <EmptyState
            title="Post d'origine introuvable"
            body="Impossible de lancer la discussion sans message initial."
          />
        )}
      </div>
    </PageContainer>
  );
}


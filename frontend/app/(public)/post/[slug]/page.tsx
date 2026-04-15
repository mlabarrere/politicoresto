import { notFound } from "next/navigation";

import { ForumPage } from "@/components/forum/forum-page";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { getPostDetail } from "@/lib/data/public/posts";
import { buildForumCommentTree, mapPostToForumPost } from "@/lib/forum/mappers";
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

  if (!detail?.thread) {
    notFound();
  }

  const post = detail.thread;
  const op = detail.threadPosts[0] ?? null;

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Post</Badge>
          <Badge variant="outline">{post.topic_status}</Badge>
        </div>

        {op ? (
          <ForumPage
            post={mapPostToForumPost(op, post.title)}
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


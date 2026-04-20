import { notFound } from "next/navigation";

import { ForumPage } from "@/components/forum/forum-page";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { ScreenState } from "@/components/layout/screen-state";
import { getPostDetail } from "@/lib/data/public/posts";
import { buildForumCommentTree, mapPostViewToForumPost } from "@/lib/forum/mappers";
import { getAuthUserId } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PostDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const currentUserId = await getAuthUserId(supabase);
  let detail;

  try {
    detail = await getPostDetail(slug, currentUserId);
  } catch (error) {
    const code = String((error as { code?: string }).code ?? "");
    const message = String((error as { message?: string }).message ?? "");
    const isForbidden = code === "42501" || message.toLowerCase().includes("permission denied");

    if (isForbidden) {
      return (
        <PageContainer>
          <ScreenState
            title="Acces refuse"
            body="Ce contenu n'est pas accessible avec vos droits actuels."
          />
        </PageContainer>
      );
    }

    throw error;
  }

  if (!detail?.post) {
    notFound();
  }

  const post = detail.post;
  const op = detail.posts[0] ?? null;

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-4">
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

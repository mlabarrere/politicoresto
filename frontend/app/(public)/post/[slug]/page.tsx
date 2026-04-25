import { notFound } from 'next/navigation';
import { AppBanner } from '@/components/app/app-banner';
import { ForumPage } from '@/components/forum/forum-page';
import { EmptyState } from '@/components/layout/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { ScreenState } from '@/components/layout/screen-state';
import { PronoDetail } from '@/components/prono/prono-detail';
import { PronoResolutionBanner } from '@/components/prono/prono-resolution-banner';
import { getPostDetail } from '@/lib/data/public/posts';
import { getPronoSummaryByTopicId } from '@/lib/data/public/pronos';
import {
  buildForumCommentTree,
  mapPostViewToForumPost,
} from '@/lib/forum/mappers';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PostDetailPage({
  params,
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
    const code = String((error as { code?: string }).code ?? '');
    const message = String((error as { message?: string }).message ?? '');
    const isForbidden =
      code === '42501' || message.toLowerCase().includes('permission denied');

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
  const isMarket = op?.type === 'market';
  const prono = isMarket
    ? await getPronoSummaryByTopicId(String(post.id), { supabase })
    : null;

  // For resolved/voided pronos, fetch the current user's bet history so
  // the banner can render the retroactive multiplier breakdown.
  interface HistoryRow {
    option_id: string;
    option_label: string;
    bet_at: string;
    multiplier: number | null;
    smoothed_share: number | null;
    points_earned: number | null;
  }
  let userBets: {
    optionId: string;
    optionLabel: string;
    betAt: string;
    isWinner: boolean;
    multiplier: number | null;
    smoothedShare: number | null;
    pointsEarned: number | null;
  }[] = [];
  if (prono?.resolution_kind && currentUserId) {
    const { data: rows } = await supabase
      .from('v_prono_user_history')
      .select(
        'option_id, option_label, bet_at, multiplier, smoothed_share, points_earned',
      )
      .eq('user_id', currentUserId)
      .eq('question_id', prono.question_id);
    const winning = new Set(prono.winning_option_ids ?? []);
    userBets = ((rows ?? []) as HistoryRow[]).map((row) => ({
      optionId: String(row.option_id),
      optionLabel: String(row.option_label),
      betAt: String(row.bet_at),
      isWinner: winning.has(String(row.option_id)),
      multiplier: row.multiplier,
      smoothedShare: row.smoothed_share,
      pointsEarned: row.points_earned,
    }));
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-4">
        {post.topic_status === 'pending_review' ? (
          <AppBanner
            tone="warning"
            title="📋 Demande en attente de validation"
            body="Cette demande de pronostic est en cours de relecture par PoliticoResto. Vous pouvez en discuter ci-dessous, mais aucun pari n'est encore ouvert."
          />
        ) : null}
        {post.topic_status === 'rejected' ? (
          <AppBanner
            tone="danger"
            title="🚫 Demande refusée"
            body="Cette demande n'a pas été retenue par PoliticoResto. La discussion reste consultable mais les paris sont fermés."
          />
        ) : null}
        {prono && post.topic_status === 'open' ? (
          <PronoDetail
            summary={prono}
            isAuthenticated={Boolean(currentUserId)}
          />
        ) : null}
        {prono?.resolution_kind ? (
          <PronoResolutionBanner summary={prono} userBets={userBets} />
        ) : null}
        {op ? (
          <ForumPage
            post={mapPostViewToForumPost(op, post.title)}
            comments={buildForumCommentTree(detail.comments, 'top')}
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

import { HomePageShell } from '@/components/home/homepage-shell';
import { PageContainer } from '@/components/layout/page-container';
import { PostCreateNudgeModal } from '@/components/profile/post-create-nudge-modal';
import { encodeCursor, getHomeScreenData } from '@/lib/data/public/home';
import {
  getProfileCompletion,
  isProfileIncomplete,
} from '@/lib/data/authenticated/profile-completion';
import { createLogger, logError } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('home');

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ nudge?: string }>;
}) {
  const start = performance.now();
  const supabase = await createServerSupabaseClient();
  const currentUserId = await getAuthUserId(supabase);
  const { nudge } = await searchParams;

  // One-time post-create nudge: show only if the user just created a
  // post (query-param from createPostAction), their demographic profile
  // is incomplete, and they haven't dismissed it before.
  let showNudge = false;
  if (currentUserId && nudge === '1') {
    const completion = await getProfileCompletion();
    showNudge =
      isProfileIncomplete(completion) && !completion.has_seen_completion_nudge;
  }

  try {
    const { data } = await getHomeScreenData(currentUserId);
    log.info(
      {
        event: 'home.rendered',
        feed_count: data.feed.length,
        subjects_count: data.subjects.length,
        authenticated: Boolean(currentUserId),
        duration_ms: Math.round(performance.now() - start),
      },
      'home data fetched',
    );

    return (
      <PageContainer>
        <div className="space-y-4">
          <HomePageShell
            items={data.feed}
            subjects={data.subjects}
            isAuthenticated={Boolean(currentUserId)}
            nextCursor={data.nextCursor ? encodeCursor(data.nextCursor) : null}
          />
        </div>
        {showNudge ? <PostCreateNudgeModal /> : null}
      </PageContainer>
    );
  } catch (err) {
    logError(log, err, {
      event: 'home.error',
      message: 'home data fetch failed',
    });
    throw err;
  }
}

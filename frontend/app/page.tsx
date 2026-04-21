import { HomePageShell } from '@/components/home/homepage-shell';
import { PageContainer } from '@/components/layout/page-container';
import { getHomeScreenData } from '@/lib/data/public/home';
import { createLogger, logError } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('home');

export default async function HomePage() {
  const start = performance.now();
  const supabase = await createServerSupabaseClient();
  const currentUserId = await getAuthUserId(supabase);

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
          />
        </div>
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

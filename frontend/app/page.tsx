import { HomePageShell } from "@/components/home/homepage-shell";
import { PageContainer } from "@/components/layout/page-container";
import { getHomeScreenData } from "@/lib/data/public/home";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser(supabase);
  const currentUserId = user?.id ?? null;
  const { data } = await getHomeScreenData(currentUserId);

  return (
    <PageContainer>
      <div className="space-y-4">
        <HomePageShell
          items={data.feed}
          isAuthenticated={Boolean(currentUserId)}
        />
      </div>
    </PageContainer>
  );
}

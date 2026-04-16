import { HomePageShell } from "@/components/home/homepage-shell";
import { AppPageHeader } from "@/components/app/app-page-header";
import { PageContainer } from "@/components/layout/page-container";
import { getPoliticalBloc } from "@/lib/data/political-taxonomy";
import { getHomeScreenData } from "@/lib/data/public/home";
import { getCurrentUser } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CategoryPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bloc = getPoliticalBloc(slug);
  const selectedBloc = bloc?.slug ?? slug;
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser(supabase);
  const currentUserId = user?.id ?? null;
  const { data } = await getHomeScreenData(selectedBloc, currentUserId);

  return (
    <PageContainer>
      <div className="space-y-4">
        <AppPageHeader
          eyebrow="Categorie"
          title={bloc?.label ?? slug}
          description="Posts filtres par categorie politique."
        />
        <HomePageShell
          items={data.feed}
          selectedBloc={selectedBloc}
          isAuthenticated={Boolean(currentUserId)}
        />
      </div>
    </PageContainer>
  );
}



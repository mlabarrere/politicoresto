import { HomePageShell } from "@/components/home/homepage-shell";
import { EmptyState } from "@/components/layout/empty-state";
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
  const { data, error } = await getHomeScreenData(selectedBloc, currentUserId);

  return (
    <PageContainer>
      <div className="space-y-4">
        <section className="app-card px-4 py-3">
          <p className="text-sm font-medium text-foreground">Categorie: {bloc?.label ?? slug}</p>
          <p className="mt-1 text-xs text-muted-foreground">Posts filtres par categorie politique.</p>
        </section>

        {error ? <EmptyState title="Feed partiel" body={`Lecture incomplete: ${error}`} /> : null}

        <HomePageShell
          items={data.feed}
          selectedBloc={selectedBloc}
          isAuthenticated={Boolean(currentUserId)}
        />
      </div>
    </PageContainer>
  );
}



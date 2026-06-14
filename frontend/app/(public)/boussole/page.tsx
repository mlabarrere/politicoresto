import type { Metadata } from 'next';
import { BoussoleQuiz } from '@/components/boussole/boussole-quiz';
import { AppPageHeader } from '@/components/app/app-page-header';
import { PageContainer } from '@/components/layout/page-container';
import { getBoussole } from '@/lib/data/public/boussole';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Boussole — quel parti me ressemble ?',
  description:
    'Réponds à quelques thèses et découvre, en un instant, le parti le plus proche de tes idées.',
};

export default async function BoussolePage() {
  const [{ theses, parties, axisWeights }, supabase] = await Promise.all([
    getBoussole(),
    createServerSupabaseClient(),
  ]);
  const userId = await getAuthUserId(supabase);

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-4">
        <AppPageHeader
          eyebrow="Boussole"
          title="Quel parti me ressemble ?"
          description="Positionne-toi sur chaque thèse — on calcule la proximité avec les partis."
        />
        <BoussoleQuiz
          theses={theses}
          parties={parties}
          axisWeights={axisWeights}
          isAuthenticated={Boolean(userId)}
        />
      </div>
    </PageContainer>
  );
}

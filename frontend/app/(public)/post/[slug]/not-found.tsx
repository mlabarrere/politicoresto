import type { Route } from 'next';
import { PageContainer } from '@/components/layout/page-container';
import { ScreenState } from '@/components/layout/screen-state';

export default function PostNotFound() {
  return (
    <PageContainer>
      <ScreenState
        title="Post introuvable"
        body="Ce post n'est pas expose publiquement, ou son slug ne correspond a aucune entree visible."
        actionHref={'/' as Route}
        actionLabel="Voir le feed"
      />
    </PageContainer>
  );
}

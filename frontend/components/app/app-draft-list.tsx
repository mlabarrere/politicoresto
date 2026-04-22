import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { AppEmptyState } from '@/components/app/app-empty-state';
import { AppBadge } from '@/components/app/app-badge';
import { formatDate } from '@/lib/utils/format';

interface DraftItem {
  id: string;
  type: string;
  title: string | null;
  updated_at: string;
}

function toDraftLabel(type: string) {
  if (type === 'market') return 'Pari';
  if (type === 'poll') return 'Sondage';
  return 'Post';
}

export function AppDraftList({
  items,
  loading = false,
  status = 'ready',
  message = null,
}: {
  items: DraftItem[];
  loading?: boolean;
  status?: 'ready' | 'unavailable' | 'error';
  message?: string | null;
}) {
  if (loading) {
    return <AppCard>Chargement des brouillons...</AppCard>;
  }

  if (status === 'unavailable') {
    return (
      <AppEmptyState
        title="Brouillons indisponibles temporairement"
        body={
          message ?? 'Cette section sera active bientot sur cet environnement.'
        }
      />
    );
  }

  if (status === 'error') {
    return (
      <AppEmptyState
        title="Brouillons indisponibles"
        body={message ?? 'Reessayez dans quelques instants.'}
      />
    );
  }

  if (!items.length) {
    return (
      <AppEmptyState
        title="Aucun brouillon"
        body="Commencez un post ou un sondage, il apparaitra ici."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AppCard key={item.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {item.title ?? 'Brouillon sans titre'}
            </p>
            <AppBadge label={toDraftLabel(item.type)} tone="info" />
          </div>
          <p className="text-xs text-muted-foreground">
            Derniere modification: {formatDate(item.updated_at)}
          </p>
          <div className="flex flex-wrap gap-2">
            <AppButton size="sm" variant="secondary" href="/post/new">
              Reprendre
            </AppButton>
            <AppButton
              size="sm"
              variant="ghost"
              disabled
              title="Suppression de brouillon bientot standardisee"
            >
              Supprimer
            </AppButton>
          </div>
        </AppCard>
      ))}
    </div>
  );
}

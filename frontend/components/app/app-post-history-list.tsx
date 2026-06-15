import { AppCard } from '@/components/app/app-card';
import { AppBadge } from '@/components/app/app-badge';
import { listStatusFallback } from '@/components/app/list-status';
import { formatDate } from '@/lib/utils/format';

interface PostHistoryItem {
  id: string;
  post_id: string;
  type: string;
  title: string | null;
  status: string;
  entity_name: string | null;
  created_at: string;
}

function toTypeLabel(type: string) {
  if (type === 'poll') return 'Sondage';
  if (type === 'market') return 'Pari';
  return 'Post';
}

export function AppPostHistoryList({
  items,
  loading = false,
  status = 'ready',
  message = null,
}: {
  items: PostHistoryItem[];
  loading?: boolean;
  status?: 'ready' | 'unavailable' | 'error';
  message?: string | null;
}) {
  const fallback = listStatusFallback({
    loading,
    status,
    itemCount: items.length,
    message,
    labels: {
      loading: 'Chargement des publications...',
      unavailableTitle: 'Publications indisponibles temporairement',
      errorTitle: 'Publications indisponibles',
      emptyTitle: 'Aucune publication',
      emptyBody: 'Vos posts publies apparaitront ici.',
    },
  });
  if (fallback) return fallback;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AppCard key={item.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {item.title ?? 'Post sans titre'}
            </p>
            <AppBadge label={item.status} tone="default" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Type: {toTypeLabel(item.type)}</span>
            <span>Date: {formatDate(item.created_at)}</span>
            <span>Theme: {item.entity_name ?? 'General'}</span>
          </div>
        </AppCard>
      ))}
    </div>
  );
}

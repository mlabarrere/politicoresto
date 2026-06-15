import { AppCard } from '@/components/app/app-card';
import { AppBadge } from '@/components/app/app-badge';
import { listStatusFallback } from '@/components/app/list-status';
import { formatDate } from '@/lib/utils/format';

interface CommentHistoryItem {
  id: string;
  body_markdown: string;
  parentTitle: string | null;
  post_status: string;
  created_at: string;
}

function excerpt(value: string) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= 140) return text;
  return `${text.slice(0, 140)}...`;
}

export function AppCommentHistoryList({
  items,
  loading = false,
  status = 'ready',
  message = null,
}: {
  items: CommentHistoryItem[];
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
      loading: 'Chargement des commentaires...',
      unavailableTitle: 'Commentaires indisponibles temporairement',
      errorTitle: 'Commentaires indisponibles',
      emptyTitle: 'Aucun commentaire',
      emptyBody: 'Vos commentaires apparaissent ici avec leur contexte.',
    },
  });
  if (fallback) return fallback;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AppCard key={item.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {excerpt(item.body_markdown)}
            </p>
            <AppBadge label={item.post_status} tone="default" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Post parent: {item.parentTitle ?? 'Non disponible'}</span>
            <span>Date: {formatDate(item.created_at)}</span>
          </div>
        </AppCard>
      ))}
    </div>
  );
}

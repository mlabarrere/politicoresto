import { AppCard } from "@/components/app/app-card";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { AppBadge } from "@/components/app/app-badge";
import { formatDate } from "@/lib/utils/format";

type CommentHistoryItem = {
  id: string;
  body_markdown: string;
  parentTitle: string | null;
  post_status: string;
  created_at: string;
};

function excerpt(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= 140) return text;
  return `${text.slice(0, 140)}...`;
}

export function AppCommentHistoryList({
  items,
  loading = false,
  status = "ready",
  message = null
}: {
  items: CommentHistoryItem[];
  loading?: boolean;
  status?: "ready" | "unavailable" | "error";
  message?: string | null;
}) {
  if (loading) {
    return <AppCard>Chargement des commentaires...</AppCard>;
  }

  if (status === "unavailable") {
    return <AppEmptyState title="Commentaires indisponibles temporairement" body={message ?? "Cette section sera active bientot sur cet environnement."} />;
  }

  if (status === "error") {
    return <AppEmptyState title="Commentaires indisponibles" body={message ?? "Reessayez dans quelques instants."} />;
  }

  if (!items.length) {
    return <AppEmptyState title="Aucun commentaire" body="Vos commentaires apparaissent ici avec leur contexte." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AppCard key={item.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{excerpt(item.body_markdown)}</p>
            <AppBadge label={item.post_status} tone="default" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Post parent: {item.parentTitle ?? "Non disponible"}</span>
            <span>Date: {formatDate(item.created_at)}</span>
          </div>
        </AppCard>
      ))}
    </div>
  );
}

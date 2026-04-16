import { AppCard } from "@/components/app/app-card";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { AppBadge } from "@/components/app/app-badge";
import { formatDate } from "@/lib/utils/format";

type PostHistoryItem = {
  id: string;
  post_id: string;
  type: string;
  title: string | null;
  status: string;
  entity_name: string | null;
  created_at: string;
};

function toTypeLabel(type: string) {
  if (type === "poll") return "Sondage";
  if (type === "market") return "Pari";
  return "Post";
}

export function AppPostHistoryList({
  items,
  loading = false,
  status = "ready",
  message = null
}: {
  items: PostHistoryItem[];
  loading?: boolean;
  status?: "ready" | "unavailable" | "error";
  message?: string | null;
}) {
  if (loading) {
    return <AppCard>Chargement des publications...</AppCard>;
  }

  if (status === "unavailable") {
    return <AppEmptyState title="Publications indisponibles temporairement" body={message ?? "Cette section sera active bientot sur cet environnement."} />;
  }

  if (status === "error") {
    return <AppEmptyState title="Publications indisponibles" body={message ?? "Reessayez dans quelques instants."} />;
  }

  if (!items.length) {
    return <AppEmptyState title="Aucune publication" body="Vos posts publies apparaitront ici." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AppCard key={item.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{item.title ?? "Post sans titre"}</p>
            <AppBadge label={item.status} tone="default" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Type: {toTypeLabel(item.type)}</span>
            <span>Date: {formatDate(item.created_at)}</span>
            <span>Theme: {item.entity_name ?? "General"}</span>
          </div>
        </AppCard>
      ))}
    </div>
  );
}

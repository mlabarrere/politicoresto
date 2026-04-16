import { AppCard } from "@/components/app/app-card";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { AppPrivacyBadge } from "@/components/app/app-privacy-badge";
import { formatDate } from "@/lib/utils/format";

type VoteHistoryItem = {
  id: string;
  vote_round: number | null;
  declared_option_label: string | null;
  declared_candidate_name: string | null;
  declared_at: string | null;
  created_at: string;
};

export function AppVoteHistoryList({
  items,
  loading = false,
  error = null
}: {
  items: VoteHistoryItem[];
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return <AppCard>Chargement de votre historique de vote...</AppCard>;
  }

  if (error) {
    return <AppEmptyState title="Historique indisponible" body={error} />;
  }

  if (!items.length) {
    return (
      <AppEmptyState
        title="Aucun vote prive"
        body="Votre journal de vote apparaitra ici. Visible uniquement par vous."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AppCard key={item.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{item.declared_option_label ?? "Vote sans etiquette"}</p>
            <AppPrivacyBadge />
          </div>
          <p className="text-sm text-muted-foreground">
            {item.declared_candidate_name ? `Candidat: ${item.declared_candidate_name}` : "Candidat non renseigne"}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Tour: {item.vote_round ?? "n/a"}</span>
            <span>Date: {formatDate(item.declared_at ?? item.created_at)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Visible uniquement par vous</p>
        </AppCard>
      ))}
    </div>
  );
}

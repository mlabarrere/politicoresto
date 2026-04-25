import { AppCard } from '@/components/app/app-card';
import type { PronoSummaryView } from '@/lib/data/public/pronos';

interface UserBetSummary {
  optionId: string;
  optionLabel: string;
  betAt: string;
  isWinner: boolean;
  multiplier: number | null;
  smoothedShare: number | null;
  pointsEarned: number | null;
}

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function PronoResolutionBanner({
  summary,
  userBets,
}: {
  summary: PronoSummaryView;
  userBets: UserBetSummary[];
}) {
  if (!summary.resolution_kind) return null;

  const winningLabels = summary.options
    .filter((o) => summary.winning_option_ids?.includes(o.id))
    .map((o) => o.label);

  if (summary.resolution_kind === 'voided') {
    return (
      <AppCard className="space-y-2 border-amber-200 bg-amber-50">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
          Pronostic annulé
        </p>
        <p className="text-sm text-amber-900">
          PoliticoResto a annulé ce pronostic.
          {summary.void_reason ? ` Raison : ${summary.void_reason}` : ''}
        </p>
        <p className="text-xs text-amber-900/80">
          Les paris restent visibles mais ne comptent pas au classement.
        </p>
      </AppCard>
    );
  }

  return (
    <AppCard className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pronostic résolu
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          ✅ Verdict : {winningLabels.join(', ')}
        </h2>
        {summary.resolved_at ? (
          <p className="text-xs text-muted-foreground">
            Tranché le {formatDateFr(summary.resolved_at)}
            {summary.resolution_note ? ` — ${summary.resolution_note}` : ''}
          </p>
        ) : null}
      </div>

      {userBets.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Votre pari
          </p>
          {userBets.map((bet) => {
            const sharePct = bet.smoothedShare
              ? Math.round(bet.smoothedShare * 100)
              : null;
            const multiplierText =
              bet.multiplier !== null ? `×${bet.multiplier.toFixed(1)}` : null;
            return (
              <div key={bet.optionId} className="space-y-1 text-sm">
                <p className="text-foreground">
                  Vous avez parié sur{' '}
                  <span className="font-medium">{bet.optionLabel}</span> le{' '}
                  {formatDateFr(bet.betAt)}.
                </p>
                {bet.isWinner ? (
                  <p className="text-emerald-700">
                    Bon pari !{' '}
                    {sharePct !== null
                      ? `${sharePct}% des autres avaient choisi cette option, `
                      : ''}
                    multiplicateur {multiplierText} ·{' '}
                    <span className="font-medium">
                      +{bet.pointsEarned ?? 0} points
                    </span>
                    .
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Mauvais pari.{' '}
                    {sharePct !== null
                      ? `${sharePct}% des autres avaient aussi choisi cette option. `
                      : ''}
                    {multiplierText
                      ? `Vous auriez gagné ${Math.round((bet.multiplier ?? 0) * 10)} points si l'option avait été retenue.`
                      : ''}
                  </p>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Le multiplicateur tient compte de la part lissée (N=10) au moment de
            votre pari, plafonnée à ×5.{' '}
            <a className="underline" href="/pronos/comment-ca-marche">
              Comment ça marche
            </a>
          </p>
        </div>
      ) : null}
    </AppCard>
  );
}

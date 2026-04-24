import Link from 'next/link';
import type { PostPollSummaryView } from '@/lib/types/views';

function toWidth(sharePercent: number) {
  const value = Math.max(0, Math.min(100, sharePercent));
  return `${value}%`;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function bandTone(band: 'indicatif' | 'correctable' | 'robuste'): {
  label: string;
  dotClass: string;
  labelClass: string;
} {
  if (band === 'robuste') {
    return {
      label: 'Robuste',
      dotClass: 'bg-emerald-500',
      labelClass: 'text-emerald-700 dark:text-emerald-300',
    };
  }
  if (band === 'correctable') {
    return {
      label: 'Correctable',
      dotClass: 'bg-amber-500',
      labelClass: 'text-amber-700 dark:text-amber-300',
    };
  }
  return {
    label: 'Indicatif',
    dotClass: 'bg-slate-400',
    labelClass: 'text-slate-600 dark:text-slate-400',
  };
}

function OptionBar({
  label,
  percent,
  rangePercent,
  color,
}: {
  label: string;
  percent: number;
  rangePercent?: [number, number] | null;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {percent.toFixed(1)}%
          {rangePercent ? (
            <span className="ml-1 text-muted-foreground">
              ({rangePercent[0].toFixed(1)}–{rangePercent[1].toFixed(1)})
            </span>
          ) : null}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: toWidth(percent) }}
        />
        {rangePercent ? (
          <div
            className="absolute top-0 h-full bg-foreground/15"
            style={{
              left: toWidth(rangePercent[0]),
              width: toWidth(rangePercent[1] - rangePercent[0]),
            }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}

export function PollResults({ poll }: { poll: PostPollSummaryView }) {
  const rawPoints = poll.raw_results;

  if (!rawPoints.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucune reponse pour l&apos;instant.
      </p>
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(poll.confidence_score)));
  const band = poll.confidence_band ?? 'indicatif';
  const tone = bandTone(band);
  const hasCorrected =
    band !== 'indicatif' && poll.corrected_results.length > 0;
  const correctedPoints = hasCorrected ? poll.corrected_results : null;
  const refDate = formatDate(poll.computed_with_ref_as_of);

  const ci95ByOption =
    hasCorrected && poll.corrected_ci95 ? poll.corrected_ci95 : null;
  const components = poll.confidence_components;

  return (
    <div className="space-y-4">
      {/* ── Header : sample size + confidence badge ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {poll.sample_size.toLocaleString('fr-FR')} réponse
          {poll.sample_size > 1 ? 's' : ''}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 ${tone.labelClass}`}
          aria-label={`Fiabilité du redressement : ${tone.label}, score ${score}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${tone.dotClass}`}
            aria-hidden="true"
          />
          Fiabilité {score}/100 · {tone.label}
        </span>
      </div>

      {/* ── Corrected distribution (only when band ≥ correctable) ── */}
      {correctedPoints ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-foreground">
            Résultat redressé
            <span className="ml-1 font-normal text-muted-foreground">
              (pondéré sur la population française)
            </span>
          </p>
          <div className="space-y-2">
            {correctedPoints.map((point) => {
              const ci = ci95ByOption?.[point.option_id];
              const rangePercent: [number, number] | null = ci
                ? [Math.max(0, ci[0] * 100), Math.min(100, ci[1] * 100)]
                : null;
              return (
                <OptionBar
                  key={`corr-${point.option_id}`}
                  label={point.option_label}
                  percent={point.share}
                  rangePercent={rangePercent}
                  color="bg-emerald-600"
                />
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Échantillon trop petit ou trop biaisé pour un redressement fiable —
          résultat brut indicatif seulement.
        </p>
      )}

      {/* ── Raw distribution (always shown) ── */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-foreground">
          Résultat brut
          <span className="ml-1 font-normal text-muted-foreground">
            (sur les répondants du site, non redressé)
          </span>
        </p>
        <div className="space-y-2">
          {rawPoints.map((point) => (
            <OptionBar
              key={`raw-${point.option_id}`}
              label={point.option_label}
              percent={point.share}
              color="bg-slate-500"
            />
          ))}
        </div>
      </div>

      {/* ── Details disclosure : sub-scores + ref date ── */}
      <details className="group rounded-md border border-border p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none font-medium text-foreground">
          Comment ce score est calculé ?
        </summary>
        <div className="mt-3 space-y-2">
          {components ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              <dt>Taille effective (Kish)</dt>
              <dd className="text-right">
                {Math.round((components.kish ?? 0) * 100)}/100
              </dd>
              <dt>Couverture population</dt>
              <dd className="text-right">
                {Math.round((components.coverage ?? 0) * 100)}/100
              </dd>
              <dt>Variabilité des poids</dt>
              <dd className="text-right">
                {Math.round((components.variability ?? 0) * 100)}/100
              </dd>
              <dt>Anti-concentration</dt>
              <dd className="text-right">
                {Math.round((components.concentration ?? 0) * 100)}/100
              </dd>
            </dl>
          ) : null}
          {refDate ? (
            <p className="pt-2">
              Référence INSEE / Ministère de l&apos;Intérieur — {refDate}.
            </p>
          ) : null}
          <p>
            <Link
              href="/methodologie"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Voir la méthodologie complète
            </Link>
          </p>
        </div>
      </details>
    </div>
  );
}

import { AppCard } from '@/components/app/app-card';
import type { PronoOptionView } from '@/lib/data/public/pronos';

/**
 * Chronological marker rendered inline with the discussion when one or
 * more options were added after the prono was published. Lives in the
 * same column as the comment fil so the timeline reads in order.
 */
export function PronoOptionAddedBanner({
  options,
}: {
  options: PronoOptionView[];
}) {
  // `is_late` is set to true exclusively by `rpc_add_option`; initial
  // options inserted via `rpc_request_prono` keep the false default.
  const lateOptions = options
    .filter((option) => option.is_late)
    .sort(
      (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime(),
    );

  if (lateOptions.length === 0) return null;

  return (
    <AppCard className="space-y-2 border-emerald-200 bg-emerald-50">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
        Mise à jour des options
      </p>
      <ul className="space-y-1 text-sm text-emerald-900">
        {lateOptions.map((option) => (
          <li key={option.id}>
            🆕 Option « <span className="font-medium">{option.label}</span> »
            ajoutée le{' '}
            {new Date(option.added_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </li>
        ))}
      </ul>
    </AppCard>
  );
}

import type { ReactNode } from 'react';
import { AppCard } from '@/components/app/app-card';
import { AppEmptyState } from '@/components/app/app-empty-state';

/**
 * Libellés d'une liste pour ses états non-nominaux (chargement / indisponible /
 * erreur / vide). Les bodies par défaut d'« indisponible » et « erreur » sont
 * communs aux listes et vivent dans `listStatusFallback`.
 */
export interface ListStatusLabels {
  loading: string;
  unavailableTitle: string;
  errorTitle: string;
  emptyTitle: string;
  emptyBody: string;
}

/**
 * Rend l'état non-nominal d'une liste, ou `null` si la liste doit s'afficher.
 * Factorise la garde `loading / unavailable / error / empty` dupliquée par les
 * listes du profil. Usage : `const fb = listStatusFallback(...); if (fb) return fb;`
 */
export function listStatusFallback({
  loading,
  status,
  itemCount,
  message,
  labels,
}: {
  loading: boolean;
  status: 'ready' | 'unavailable' | 'error';
  itemCount: number;
  message: string | null;
  labels: ListStatusLabels;
}): ReactNode {
  if (loading) {
    return <AppCard>{labels.loading}</AppCard>;
  }
  if (status === 'unavailable') {
    return (
      <AppEmptyState
        title={labels.unavailableTitle}
        body={
          message ?? 'Cette section sera active bientot sur cet environnement.'
        }
      />
    );
  }
  if (status === 'error') {
    return (
      <AppEmptyState
        title={labels.errorTitle}
        body={message ?? 'Reessayez dans quelques instants.'}
      />
    );
  }
  if (itemCount === 0) {
    return <AppEmptyState title={labels.emptyTitle} body={labels.emptyBody} />;
  }
  return null;
}

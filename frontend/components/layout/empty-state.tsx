import type { Route } from 'next';
import { AppEmptyState } from '@/components/app/app-empty-state';

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: Route;
  actionLabel?: string;
}) {
  return (
    <AppEmptyState
      title={title}
      body={body}
      actionHref={actionHref}
      actionLabel={actionLabel}
    />
  );
}

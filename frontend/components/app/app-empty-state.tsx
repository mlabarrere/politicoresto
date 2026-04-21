import type { Route } from 'next';
import { AppBanner } from '@/components/app/app-banner';
import { AppButton } from '@/components/app/app-button';

export function AppEmptyState({
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
    <AppBanner title={title} body={body} className="space-y-3">
      {actionHref && actionLabel ? (
        <AppButton variant="secondary" href={actionHref}>
          {actionLabel}
        </AppButton>
      ) : null}
    </AppBanner>
  );
}

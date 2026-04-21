import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Compass, RefreshCw } from 'lucide-react';

import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';

type ScreenStateProps = {
  title: string;
  body: string;
  actionHref?: Route;
  actionLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ScreenState({
  title,
  body,
  actionHref,
  actionLabel,
  retryLabel,
  onRetry,
}: ScreenStateProps) {
  return (
    <AppCard className="flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex items-center gap-3 text-primary">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Compass className="size-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Infos utiles
        </p>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          {body}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {actionHref && actionLabel ? (
          <Link href={actionHref}>
            <AppButton size="sm">
              {actionLabel}
              <ArrowRight data-icon="inline-end" />
            </AppButton>
          </Link>
        ) : null}
        {onRetry && retryLabel ? (
          <AppButton variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw data-icon="inline-start" />
            {retryLabel}
          </AppButton>
        ) : null}
      </div>
    </AppCard>
  );
}

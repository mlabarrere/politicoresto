import type { PropsWithChildren, ReactNode } from 'react';
import { AppCard } from '@/components/app/app-card';
import { cn } from '@/lib/utils';

export function SectionCard({
  title,
  eyebrow,
  children,
  aside,
  className,
  contentClassName,
}: PropsWithChildren<{
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  className?: string;
  contentClassName?: string;
}>) {
  return (
    <AppCard className={cn('overflow-hidden', className)}>
      <div className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {title}
            </h2>
          </div>
          {aside}
        </div>
      </div>
      <div className={cn('pt-0', contentClassName)}>{children}</div>
    </AppCard>
  );
}

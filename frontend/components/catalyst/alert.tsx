import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

export function CatalystAlert({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={clsx(
        'rounded-xl border border-border bg-white p-4 shadow-[var(--shadow-sm)]',
        className,
      )}
    />
  );
}

export function CatalystAlertTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    // eslint-disable-next-line jsx-a11y/heading-has-content -- children are forwarded via the spread props by callers
    <h3
      {...props}
      className={clsx('text-sm font-semibold text-foreground', className)}
    />
  );
}

export function CatalystAlertBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={clsx('mt-1 text-sm text-muted-foreground', className)}
    />
  );
}

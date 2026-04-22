import clsx from 'clsx';
import type { TextareaHTMLAttributes } from 'react';

export function CatalystTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        'w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] outline-none transition',
        'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50',
        className,
      )}
    />
  );
}

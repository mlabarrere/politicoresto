import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function AppCheckbox({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'size-4 rounded border border-input bg-background text-primary accent-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        className,
      )}
      {...props}
    />
  );
}

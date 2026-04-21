import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { CatalystButton } from '@/components/catalyst/button';
import { cn } from '@/lib/utils';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost';
type AppButtonSize = 'sm' | 'md' | 'lg';

const toneByVariant: Record<AppButtonVariant, 'solid' | 'soft' | 'plain'> = {
  primary: 'solid',
  secondary: 'soft',
  ghost: 'plain',
};

export function AppButton({
  variant = 'primary',
  size = 'sm',
  href,
  icon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  href?: string;
  icon?: ReactNode;
}) {
  if (href) {
    return (
      <Link
        href={href as never}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          size === 'sm'
            ? 'px-3 py-1.5 text-xs'
            : size === 'lg'
              ? 'px-4 py-2.5 text-sm'
              : 'px-3.5 py-2 text-sm',
          variant === 'primary' &&
            'border-primary bg-primary text-primary-foreground hover:brightness-95',
          variant === 'secondary' &&
            'border-border bg-secondary text-secondary-foreground hover:brightness-95',
          variant === 'ghost' &&
            'border-transparent bg-transparent text-foreground hover:bg-secondary',
          className,
        )}
      >
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <CatalystButton
      tone={toneByVariant[variant]}
      size={size}
      icon={icon}
      className={className}
      {...props}
    >
      {children}
    </CatalystButton>
  );
}

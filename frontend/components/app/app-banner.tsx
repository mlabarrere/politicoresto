import type { HTMLAttributes, ReactNode } from 'react';
import {
  CatalystAlert,
  CatalystAlertBody,
  CatalystAlertTitle,
} from '@/components/catalyst/alert';
import { cn } from '@/lib/utils';

export function AppBanner({
  title,
  body,
  tone = 'default',
  className,
  children,
  ...props
}: {
  title: string;
  body: string;
  tone?: 'default' | 'warning' | 'danger';
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>) {
  return (
    <CatalystAlert
      {...props}
      className={cn(
        tone === 'warning' && 'border-amber-200 bg-amber-50',
        tone === 'danger' && 'border-rose-200 bg-rose-50',
        className,
      )}
    >
      <CatalystAlertTitle>{title}</CatalystAlertTitle>
      <CatalystAlertBody>{body}</CatalystAlertBody>
      {children}
    </CatalystAlert>
  );
}

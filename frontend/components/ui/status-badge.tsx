import { AppBadge } from '@/components/app/app-badge';

export function StatusBadge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?:
    | 'default'
    | 'accent'
    | 'muted'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger';
}) {
  return <AppBadge label={label} tone={tone} />;
}

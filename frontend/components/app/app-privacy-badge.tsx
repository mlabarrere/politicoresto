import { Lock } from 'lucide-react';
import { AppBadge } from '@/components/app/app-badge';

export function AppPrivacyBadge({ label = 'Prive' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <AppBadge label={label} tone="muted" />
    </span>
  );
}

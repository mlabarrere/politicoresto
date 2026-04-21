import { UserRound } from 'lucide-react';
import { AppCard } from '@/components/app/app-card';
import { AppInput } from '@/components/app/app-input';

export function AppAvatarUploader({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  return (
    <AppCard className="space-y-3 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Photo de profil
      </p>
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
          <UserRound className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Avatar public</p>
          <p className="text-xs text-muted-foreground">
            URL image (optionnelle)
          </p>
        </div>
      </div>
      <AppInput
        name="avatar_url"
        defaultValue={defaultValue ?? ''}
        placeholder="https://..."
      />
    </AppCard>
  );
}

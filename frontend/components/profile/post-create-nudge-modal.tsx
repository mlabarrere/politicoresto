'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@base-ui/react/dialog';
import { AppButton } from '@/components/app/app-button';
import { dismissCompletionNudgeAction } from '@/lib/actions/profile';

/**
 * Shown once ever, after a user's first post if their demographic profile
 * is incomplete. Dismissal flips `has_seen_completion_nudge` server-side,
 * so it never re-appears for this user.
 */
export function PostCreateNudgeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  function onClose() {
    setOpen(false);
    startTransition(() => {
      void dismissCompletionNudgeAction();
    });
  }

  function onGo() {
    setOpen(false);
    startTransition(() => {
      void dismissCompletionNudgeAction();
    });
    router.push('/me?section=profile');
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Popup
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-popover p-5 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
          aria-label="Complétez votre profil"
        >
          <Dialog.Title className="text-base font-semibold text-foreground">
            Bravo pour votre premier post !
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Vos publications comptent davantage quand votre profil est complet.
            Cela prend 30 secondes : date de naissance + code postal.
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AppButton variant="ghost" onClick={onClose} disabled={pending}>
              Plus tard
            </AppButton>
            <AppButton onClick={onGo} disabled={pending}>
              Compléter
            </AppButton>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

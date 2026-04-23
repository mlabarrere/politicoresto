'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Dialog } from '@base-ui/react/dialog';
import { Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { AppButton } from '@/components/app/app-button';
import {
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuTrigger,
} from '@/components/app/app-dropdown-menu';
import { deletePostAction } from '@/lib/actions/posts';

export interface PostOwnerMenuProps {
  postItemId: string;
  postSlug: string;
  canEdit: boolean;
  editLockReason?: string | null;
}

export function PostOwnerMenu({
  postItemId,
  postSlug,
  canEdit,
  editLockReason = null,
}: PostOwnerMenuProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function confirmDelete() {
    const form = new FormData();
    form.set('post_item_id', postItemId);
    startTransition(() => {
      void deletePostAction(form);
    });
  }

  return (
    <>
      <AppDropdownMenu>
        <AppDropdownMenuTrigger
          render={
            <AppButton
              variant="ghost"
              size="sm"
              disabled={pending}
              aria-label="Actions post"
            >
              <Ellipsis className="size-4" />
            </AppButton>
          }
        />
        <AppDropdownMenuContent side="bottom" align="end" className="min-w-44">
          {canEdit ? (
            <AppDropdownMenuItem
              onClick={() => {
                router.push(`/post/${postSlug}/edit` as Route);
              }}
            >
              <Pencil className="size-4" /> Modifier
            </AppDropdownMenuItem>
          ) : editLockReason ? (
            <AppDropdownMenuItem disabled title={editLockReason}>
              <Pencil className="size-4" /> Modifier
            </AppDropdownMenuItem>
          ) : null}
          <AppDropdownMenuItem
            variant="destructive"
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="size-4" /> Supprimer
          </AppDropdownMenuItem>
        </AppDropdownMenuContent>
      </AppDropdownMenu>

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0" />
          <Dialog.Popup
            className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-popover p-5 text-popover-foreground shadow-xl ring-1 ring-foreground/10 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95"
            aria-label="Confirmer la suppression"
          >
            <Dialog.Title className="text-base font-semibold text-foreground">
              Supprimer ce post ?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Cette action est irréversible.
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close
                render={<AppButton variant="ghost">Annuler</AppButton>}
              />
              <AppButton
                variant="primary"
                disabled={pending}
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:brightness-95"
              >
                {pending ? 'Suppression...' : 'Supprimer'}
              </AppButton>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

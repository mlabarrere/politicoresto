"use client";

import { Ellipsis, Pencil, Trash2, Link2 } from "lucide-react";

import { AppButton } from "@/components/app/app-button";
import {
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuTrigger
} from "@/components/app/app-dropdown-menu";
import type { CommentActionsMenuProps } from "@/lib/types/forum-components";

export function CommentActionsMenu({
  canEdit,
  canDelete,
  disabled,
  onEdit,
  onDelete,
  onCopyLink
}: CommentActionsMenuProps) {
  return (
    <AppDropdownMenu>
      <AppDropdownMenuTrigger render={<AppButton variant="ghost" size="sm" disabled={disabled} aria-label="Actions commentaire"><Ellipsis className="size-4" /></AppButton>} />
      <AppDropdownMenuContent side="bottom" align="end" className="min-w-44">
        <AppDropdownMenuItem onClick={onCopyLink}>
          <Link2 className="size-4" /> Copier le lien
        </AppDropdownMenuItem>
        {canEdit ? (
          <AppDropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" /> Modifier
          </AppDropdownMenuItem>
        ) : null}
        {canDelete ? (
          <AppDropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" /> Supprimer
          </AppDropdownMenuItem>
        ) : null}
      </AppDropdownMenuContent>
    </AppDropdownMenu>
  );
}

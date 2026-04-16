"use client";

import { Ellipsis, Pencil, Trash2, Link2 } from "lucide-react";

import { AppButton } from "@/components/app/app-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger render={<AppButton variant="ghost" size="sm" disabled={disabled} aria-label="Actions commentaire"><Ellipsis className="size-4" /></AppButton>} />
      <DropdownMenuContent side="bottom" align="end" className="min-w-44">
        <DropdownMenuItem onClick={onCopyLink}>
          <Link2 className="size-4" /> Copier le lien
        </DropdownMenuItem>
        {canEdit ? (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" /> Modifier
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" /> Supprimer
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

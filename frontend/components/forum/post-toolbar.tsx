"use client";

import { AppButton } from "@/components/app/app-button";
import { AppFilter } from "@/components/app/app-filter";
import type { PostToolbarProps } from "@/lib/types/forum-components";

const SORT_OPTIONS: Array<{ value: "top" | "recent" | "oldest"; label: string }> = [
  { value: "top", label: "Populaires" },
  { value: "recent", label: "Récentes" },
  { value: "oldest", label: "Anciennes" }
];

export function PostToolbar({
  sortMode,
  collapsedAll,
  compactMode,
  showComposer,
  composerSlot,
  onSortChange,
  onToggleCollapseAll,
  onToggleCompactMode,
  onToggleComposer
}: PostToolbarProps) {
  return (
    <div className="space-y-2 app-card px-3 py-2" aria-label="Outils du post">
      <div className="flex flex-wrap items-center gap-2">
        <AppFilter options={SORT_OPTIONS} value={sortMode} onChange={onSortChange} />

        <AppButton type="button" variant="secondary" onClick={onToggleCollapseAll}>
          {collapsedAll ? "Tout déplier" : "Tout replier"}
        </AppButton>

        <AppButton type="button" variant="secondary" onClick={onToggleCompactMode}>
          {compactMode ? "Vue normale" : "Vue compacte"}
        </AppButton>

        <AppButton type="button" variant="secondary" onClick={onToggleComposer}>
          {showComposer ? "Masquer le formulaire" : "Répondre"}
        </AppButton>
      </div>

      {showComposer ? composerSlot : null}
    </div>
  );
}

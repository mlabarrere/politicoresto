"use client";

import { Button } from "@/components/ui/button";
import type { ThreadToolbarProps } from "@/lib/types/forum-components";

export function ThreadToolbar({
  sortMode,
  collapsedAll,
  compactMode,
  showComposer,
  composerSlot,
  onSortChange,
  onToggleCollapseAll,
  onToggleCompactMode,
  onToggleComposer
}: ThreadToolbarProps) {
  return (
    <div className="space-y-2 app-card px-3 py-2" aria-label="Outils du thread">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {([
            ["top", "Populaires"],
            ["recent", "Récentes"],
            ["oldest", "Anciennes"]
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={sortMode === value ? "default" : "outline"}
              onClick={() => onSortChange(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Button type="button" size="sm" variant="outline" onClick={onToggleCollapseAll}>
          {collapsedAll ? "Tout déplier" : "Tout replier"}
        </Button>

        <Button type="button" size="sm" variant="outline" onClick={onToggleCompactMode}>
          {compactMode ? "Vue normale" : "Vue compacte"}
        </Button>

        <Button type="button" size="sm" variant="outline" onClick={onToggleComposer}>
          {showComposer ? "Masquer le formulaire" : "Répondre"}
        </Button>
      </div>

      {showComposer ? composerSlot : null}
    </div>
  );
}





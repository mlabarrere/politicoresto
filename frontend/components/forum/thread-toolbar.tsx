"use client";

import { Button } from "@/components/ui/button";
import type { ThreadToolbarProps } from "@/lib/types/forum-components";

export function ThreadToolbar({
  sortMode,
  collapsedAll,
  compactMode,
  onSortChange,
  onToggleCollapseAll,
  onToggleCompactMode
}: ThreadToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1">
        {([
          ["top", "Top"],
          ["recent", "Recent"],
          ["oldest", "Ancien"]
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
        {collapsedAll ? "Tout deplier" : "Tout replier"}
      </Button>

      <Button type="button" size="sm" variant="outline" onClick={onToggleCompactMode}>
        {compactMode ? "Vue normale" : "Vue compacte"}
      </Button>
    </div>
  );
}

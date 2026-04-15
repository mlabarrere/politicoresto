"use client";

import { Button } from "@/components/ui/button";
import type { FeedSortMode, FeedToolbarProps } from "@/lib/types/homepage";

const SORTS: Array<{ value: FeedSortMode; label: string }> = [
  { value: "top", label: "Top" },
  { value: "recent", label: "Recent" },
  { value: "most_comments", label: "Commentaires" }
];

export function FeedToolbar({ sortMode, onSortChange }: FeedToolbarProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-2 app-card px-3 py-2">
      <div className="flex items-center gap-1">
        {SORTS.map((sort) => (
          <Button
            key={sort.value}
            type="button"
            size="sm"
            variant={sortMode === sort.value ? "default" : "outline"}
            onClick={() => onSortChange(sort.value)}
          >
            {sort.label}
          </Button>
        ))}
      </div>
    </section>
  );
}




"use client";

import { AppCard } from "@/components/app/app-card";
import { AppFilterBar } from "@/components/app/app-filter-bar";
import type { FeedSortMode, FeedToolbarProps } from "@/lib/types/homepage";

const SORTS: Array<{ value: FeedSortMode; label: string }> = [
  { value: "top", label: "Top" },
  { value: "recent", label: "Recent" },
  { value: "most_comments", label: "Commentaires" }
];

export function FeedToolbar({ sortMode, onSortChange }: FeedToolbarProps) {
  return (
    <AppCard className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <AppFilterBar options={SORTS} value={sortMode} onChange={onSortChange} />
    </AppCard>
  );
}




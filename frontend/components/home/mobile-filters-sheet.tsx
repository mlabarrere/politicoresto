"use client";

import { SlidersHorizontal } from "lucide-react";

import { AppButton } from "@/components/app/app-button";
import { AppDrawer } from "@/components/app/app-drawer";
import { AppFilterBar } from "@/components/app/app-filter-bar";
import type { FeedSortMode } from "@/lib/types/homepage";

const SORTS: Array<{ value: FeedSortMode; label: string }> = [
  { value: "top", label: "Top" },
  { value: "recent", label: "Recent" },
  { value: "most_comments", label: "Commentaires" }
];

export function MobileFiltersSheet({
  sortMode,
  onSortChange
}: {
  sortMode: FeedSortMode;
  onSortChange: (mode: FeedSortMode) => void;
}) {
  return (
    <AppDrawer
      side="bottom"
      title="Filtres du feed"
      trigger={
        <AppButton variant="secondary" size="sm" aria-label="Ouvrir les filtres" icon={<SlidersHorizontal className="size-4" />}>
          Filtres
        </AppButton>
      }
    >
      <AppFilterBar className="mt-2 grid gap-2" options={SORTS} value={sortMode} onChange={onSortChange} />
    </AppDrawer>
  );
}

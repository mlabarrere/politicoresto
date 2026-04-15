"use client";

import { SlidersHorizontal } from "lucide-react";

import { AppButton } from "@/components/app/app-button";
import { AppFilter } from "@/components/app/app-filter";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
    <Sheet>
      <SheetTrigger render={<AppButton variant="secondary" size="sm" aria-label="Ouvrir les filtres" />}>
        <SlidersHorizontal className="size-4" />
        Filtres
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl bg-card">
        <SheetTitle className="text-lg font-semibold tracking-tight">Filtres du feed</SheetTitle>
        <AppFilter
          className="mt-4 grid gap-2"
          options={SORTS}
          value={sortMode}
          onChange={onSortChange}
        />
      </SheetContent>
    </Sheet>
  );
}

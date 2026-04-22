'use client';

import { SlidersHorizontal } from 'lucide-react';
import { AppButton } from '@/components/app/app-button';
import { AppDrawer } from '@/components/app/app-drawer';
import { AppFilterBar } from '@/components/app/app-filter-bar';
import { HOME_FEED_SORT_OPTIONS } from '@/lib/ui/feed-sort-options';
import type { FeedSortMode } from '@/lib/types/homepage';

export function MobileFiltersSheet({
  sortMode,
  onSortChange,
}: {
  sortMode: FeedSortMode;
  onSortChange: (mode: FeedSortMode) => void;
}) {
  return (
    <AppDrawer
      side="bottom"
      title="Filtres du feed"
      trigger={
        <AppButton
          variant="secondary"
          size="sm"
          aria-label="Ouvrir les filtres"
          icon={<SlidersHorizontal className="size-4" />}
        >
          Filtres
        </AppButton>
      }
    >
      <AppFilterBar
        className="mt-2 grid gap-2"
        options={HOME_FEED_SORT_OPTIONS}
        value={sortMode}
        onChange={onSortChange}
      />
    </AppDrawer>
  );
}

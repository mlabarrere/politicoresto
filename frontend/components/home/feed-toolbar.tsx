'use client';

import { AppCard } from '@/components/app/app-card';
import { AppFilterBar } from '@/components/app/app-filter-bar';
import { HOME_FEED_SORT_OPTIONS } from '@/lib/ui/feed-sort-options';
import type { FeedToolbarProps } from '@/lib/types/homepage';

export function FeedToolbar({ sortMode, onSortChange }: FeedToolbarProps) {
  return (
    <AppCard className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <AppFilterBar
        options={HOME_FEED_SORT_OPTIONS}
        value={sortMode}
        onChange={onSortChange}
      />
    </AppCard>
  );
}

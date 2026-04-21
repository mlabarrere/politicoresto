'use client';

import { useState } from 'react';

import { FeedToolbar } from '@/components/home/feed-toolbar';
import { LeftSidebar } from '@/components/home/left-sidebar';
import { MobileFiltersSheet } from '@/components/home/mobile-filters-sheet';
import { MobileNavDrawer } from '@/components/home/mobile-nav-drawer';
import { ResponsiveLayoutGrid } from '@/components/home/responsive-layout-grid';
import { PostFeed } from '@/components/home/post-feed';
import { SubjectFilterBar } from '@/components/home/subject-filter-bar';
import type {
  CategoryFilter,
  FeedSortMode,
  HomePageShellProps,
} from '@/lib/types/homepage';

export function HomePageShell({
  items,
  isAuthenticated,
  subjects,
}: HomePageShellProps) {
  const [sortMode, setSortMode] = useState<FeedSortMode>('popular');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <MobileNavDrawer />
        <MobileFiltersSheet sortMode={sortMode} onSortChange={setSortMode} />
      </div>

      <ResponsiveLayoutGrid
        left={
          <LeftSidebar
            activeFilter={categoryFilter}
            onFilterChange={setCategoryFilter}
          />
        }
      >
        <FeedToolbar sortMode={sortMode} onSortChange={setSortMode} />
        <SubjectFilterBar
          subjects={subjects}
          activeFilter={categoryFilter}
          onFilterChange={setCategoryFilter}
        />
        <PostFeed
          items={items}
          isAuthenticated={isAuthenticated}
          sortMode={sortMode}
          categoryFilter={categoryFilter}
        />
      </ResponsiveLayoutGrid>
    </div>
  );
}

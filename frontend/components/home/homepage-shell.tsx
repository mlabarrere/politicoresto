"use client";

import { useState } from "react";

import { CompactForumHeader } from "@/components/home/compact-forum-header";
import { CreateThreadCTA } from "@/components/home/create-thread-cta";
import { FeedToolbar } from "@/components/home/feed-toolbar";
import { LeftSidebar } from "@/components/home/left-sidebar";
import { MobileFiltersSheet } from "@/components/home/mobile-filters-sheet";
import { MobileNavDrawer } from "@/components/home/mobile-nav-drawer";
import { ResponsiveLayoutGrid } from "@/components/home/responsive-layout-grid";
import { RightSidebar } from "@/components/home/right-sidebar";
import { ThreadFeed } from "@/components/home/thread-feed";
import type { FeedSortMode, HomePageShellProps } from "@/lib/types/homepage";

export function HomePageShell({ items, isAuthenticated, selectedBloc }: HomePageShellProps) {
  const [sortMode, setSortMode] = useState<FeedSortMode>("top");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <MobileNavDrawer selectedBloc={selectedBloc} />
        <MobileFiltersSheet
          sortMode={sortMode}
          onSortChange={setSortMode}
        />
      </div>

      <ResponsiveLayoutGrid
        left={<LeftSidebar selectedBloc={selectedBloc} />}
        right={<RightSidebar sortMode={sortMode} postCount={items.length} />}
      >
        <CompactForumHeader />
        <FeedToolbar sortMode={sortMode} onSortChange={setSortMode} />
        <ThreadFeed items={items} isAuthenticated={isAuthenticated} sortMode={sortMode} />
      </ResponsiveLayoutGrid>

      <CreateThreadCTA floating />
    </div>
  );
}

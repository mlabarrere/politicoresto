"use client";

import { useEffect, useMemo, useState } from "react";

import { AppButton } from "@/components/app/app-button";
import { EmptyState } from "@/components/layout/empty-state";
import { AppFeedItem } from "@/components/app/app-feed-item";
import { HOME_STRINGS } from "@/lib/ui/strings";
import type { FeedSortMode } from "@/lib/types/homepage";
import type { PostFeedItemView } from "@/lib/types/views";

const INITIAL_VISIBLE_ITEMS = 20;
const MAX_VISIBLE_ITEMS = 30;
const LOAD_MORE_STEP = 10;
const HOME_SCROLL_KEY = "politicoresto:home-scroll-y";

function sortItems(items: PostFeedItemView[], sortMode: FeedSortMode) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortMode === "recent") {
      return new Date(b.last_activity_at ?? b.open_at ?? 0).getTime() - new Date(a.last_activity_at ?? a.open_at ?? 0).getTime();
    }

    return Number((b.editorial_feed_score ?? 0) - (a.editorial_feed_score ?? 0));
  });

  return sorted;
}

export function PostFeed({
  items,
  isAuthenticated,
  sortMode
}: {
  items: PostFeedItemView[];
  isAuthenticated: boolean;
  sortMode: FeedSortMode;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const sortedItems = useMemo(() => sortItems(items, sortMode), [items, sortMode]);
  const cappedItems = sortedItems.slice(0, MAX_VISIBLE_ITEMS);
  const visibleItems = cappedItems.slice(0, visibleCount);
  const canLoadMore = visibleCount < cappedItems.length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(HOME_SCROLL_KEY);
    if (!raw) return;
    const y = Number(raw);
    if (Number.isFinite(y) && y >= 0) {
      window.requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      window.sessionStorage.setItem(HOME_SCROLL_KEY, String(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!cappedItems.length) {
    return (
      <EmptyState
        title={HOME_STRINGS.emptyTitle}
        body={HOME_STRINGS.emptyBody}
        actionHref="/post/new"
        actionLabel={HOME_STRINGS.emptyCta}
      />
    );
  }

  return (
    <div className="space-y-3">
      {visibleItems.map((item) => (
        <AppFeedItem key={item.topic_id} item={item} isAuthenticated={isAuthenticated} />
      ))}
      {canLoadMore ? (
        <div className="flex justify-center pt-1">
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => setVisibleCount((value) => Math.min(value + LOAD_MORE_STEP, MAX_VISIBLE_ITEMS))}
          >
            {HOME_STRINGS.loadMore}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}

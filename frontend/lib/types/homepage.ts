import type { PostFeedItemView } from "@/lib/types/views";

export type FeedSortMode = "popular" | "recent";

export type HomePageShellProps = {
  items: PostFeedItemView[];
  isAuthenticated: boolean;
};

export type FeedToolbarProps = {
  sortMode: FeedSortMode;
  onSortChange: (mode: FeedSortMode) => void;
};


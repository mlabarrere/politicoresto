import type { PostFeedItemView } from "@/lib/types/views";

export type FeedSortMode = "popular" | "recent";

export type CategoryFilter =
  | { type: "sondage"; status: "open" | "closed" }
  | { type: "politique"; blocSlug: string }
  | null;

export type HomePageShellProps = {
  items: PostFeedItemView[];
  isAuthenticated: boolean;
};

export type FeedToolbarProps = {
  sortMode: FeedSortMode;
  onSortChange: (mode: FeedSortMode) => void;
};


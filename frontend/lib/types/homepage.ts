import type { ThreadFeedItemView } from "@/lib/types/views";

export type FeedSortMode = "top" | "recent" | "most_comments";

export type HomePageShellProps = {
  items: ThreadFeedItemView[];
  isAuthenticated: boolean;
  selectedBloc: string | null;
};

export type FeedToolbarProps = {
  sortMode: FeedSortMode;
  onSortChange: (mode: FeedSortMode) => void;
};

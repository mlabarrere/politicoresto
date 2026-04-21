import type { PostFeedItemView } from '@/lib/types/views';
import type { SubjectView } from '@/lib/types/screens';

export type FeedSortMode = 'popular' | 'recent' | 'sondages';

export type CategoryFilter =
  | { type: 'sondage'; status: 'open' | 'closed' }
  | { type: 'politique'; blocSlug: string }
  | { type: 'subject'; slug: string }
  | { type: 'parti'; slug: string }
  | null;

export type HomePageShellProps = {
  items: PostFeedItemView[];
  isAuthenticated: boolean;
  subjects: SubjectView[];
};

export type FeedToolbarProps = {
  sortMode: FeedSortMode;
  onSortChange: (mode: FeedSortMode) => void;
};

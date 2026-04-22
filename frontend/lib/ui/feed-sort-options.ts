import type { FeedSortMode } from '@/lib/types/homepage';

export const HOME_FEED_SORT_OPTIONS: {
  value: FeedSortMode;
  label: string;
}[] = [
  { value: 'popular', label: 'Populaires' },
  { value: 'recent', label: 'Récents' },
  { value: 'sondages', label: 'Sondages' },
];

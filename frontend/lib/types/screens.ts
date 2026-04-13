import type {
  CardCatalogRow,
  CommentView,
  LeaderboardEntryView,
  MyCardInventoryView,
  MyPredictionHistoryView,
  MyReputationSummaryView,
  PollOptionRow,
  PollQuestionRow,
  PollRow,
  PostRow,
  PredictionOptionRow,
  PredictionQuestionRow,
  PublicCardShowcaseView,
  PublicPollResultsView,
  PublicProfileView,
  SpaceRow,
  ThreadFeedItemView,
  ThreadPostView,
  ThreadPredictionAggregateView,
  ThreadRow,
  ThreadSummaryView
} from "@/lib/types/views";

export type LoadState<T> = {
  data: T;
  error: string | null;
};

export type HomeScreenData = {
  feed: ThreadFeedItemView[];
  watchlist: ThreadFeedItemView[];
  featuredSpaces: SpaceRow[];
  leaderboard: LeaderboardEntryView[];
};

export type SpacesScreenData = {
  spaces: SpaceRow[];
  highlightedThreads: ThreadSummaryView[];
};

export type ThreadsScreenData = {
  threads: Array<ThreadSummaryView & { aggregate?: ThreadPredictionAggregateView | null }>;
};

export type CardsScreenData = {
  catalog: CardCatalogRow[];
  showcase: PublicCardShowcaseView[];
};

export type PublicProfileScreenData = {
  profile: PublicProfileView | null;
};

export type ThreadDetailScreenData = {
  thread: ThreadRow | null;
  question: PredictionQuestionRow | null;
  options: PredictionOptionRow[];
  polls: Array<PollRow & { questions: Array<PollQuestionRow & { options: PollOptionRow[]; results: PublicPollResultsView[] }> }>;
  posts: PostRow[];
  threadPosts: ThreadPostView[];
  comments: CommentView[];
  localLeaderboard: LeaderboardEntryView[];
  relatedThreads: ThreadSummaryView[];
  aggregate: ThreadPredictionAggregateView | null;
};

export type SpaceDetailScreenData = {
  space: SpaceRow | null;
  threads: ThreadSummaryView[];
  feed: ThreadFeedItemView[];
  leaderboard: LeaderboardEntryView[];
};

export type MeDashboardScreenData = {
  reputation: MyReputationSummaryView | null;
  cards: MyCardInventoryView[];
  predictions: MyPredictionHistoryView[];
};

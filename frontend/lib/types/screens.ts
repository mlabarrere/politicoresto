import type {
  CardCatalogRow,
  HomeFeedTopicView,
  LeaderboardEntryView,
  MyCardInventoryView,
  MyPredictionHistoryView,
  MyReputationSummaryView,
  PollOptionRow,
  PollQuestionRow,
  PollRow,
  PostRow,
  CommentView,
  PredictionOptionRow,
  PredictionQuestionRow,
  PublicCardShowcaseView,
  PublicPollResultsView,
  PublicProfileView,
  SpaceRow,
  ThreadPostView,
  TerritoryPredictionRollupView,
  TerritoryTopicRollupView,
  TopicPredictionAggregateView,
  TopicRow,
  TopicSummaryView
} from "@/lib/types/views";

export type LoadState<T> = {
  data: T;
  error: string | null;
};

export type HomeScreenData = {
  feed: HomeFeedTopicView[];
  watchlist: HomeFeedTopicView[];
  featuredSpaces: SpaceRow[];
  leaderboard: LeaderboardEntryView[];
};

export type SpacesScreenData = {
  spaces: SpaceRow[];
  highlightedTopics: TopicSummaryView[];
};

export type TopicsScreenData = {
  topics: Array<TopicSummaryView & { aggregate?: TopicPredictionAggregateView | null }>;
};

export type TerritoriesScreenData = {
  topicRollups: TerritoryTopicRollupView[];
  predictionRollups: TerritoryPredictionRollupView[];
};

export type CardsScreenData = {
  catalog: CardCatalogRow[];
  showcase: PublicCardShowcaseView[];
};

export type PublicProfileScreenData = {
  profile: PublicProfileView | null;
};

export type TopicDetailScreenData = {
  topic: TopicRow | null;
  question: PredictionQuestionRow | null;
  options: PredictionOptionRow[];
  polls: Array<PollRow & { questions: Array<PollQuestionRow & { options: PollOptionRow[]; results: PublicPollResultsView[] }> }>;
  posts: PostRow[];
  threadPosts: ThreadPostView[];
  comments: CommentView[];
  localLeaderboard: LeaderboardEntryView[];
  relatedTopics: TopicSummaryView[];
  aggregate: TopicPredictionAggregateView | null;
};

export type SpaceDetailScreenData = {
  space: SpaceRow | null;
  topics: TopicSummaryView[];
  feed: HomeFeedTopicView[];
  leaderboard: LeaderboardEntryView[];
};

export type PollDetailScreenData = {
  poll: PollRow | null;
  questions: Array<PollQuestionRow & { options: PollOptionRow[]; results: PublicPollResultsView[] }>;
};

export type MeDashboardScreenData = {
  reputation: MyReputationSummaryView | null;
  cards: MyCardInventoryView[];
  predictions: MyPredictionHistoryView[];
};

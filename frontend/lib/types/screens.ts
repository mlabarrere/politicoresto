import type {
  CardCatalogRow,
  HomeFeedTopicView,
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
  cards: HomeFeedTopicView[];
  territories: HomeFeedTopicView[];
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
  posts: PostRow[];
  aggregate: TopicPredictionAggregateView | null;
};

export type SpaceDetailScreenData = {
  space: SpaceRow | null;
  topics: TopicSummaryView[];
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

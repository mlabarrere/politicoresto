export type PublicProfileView = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  created_at: string;
};

export type TopicAggregatePayload = {
  primary_value: string | number | null;
  primary_label: string | null;
  secondary_value: string | number | null;
  secondary_label: string | null;
  unit_label: string | null;
  submission_count: number;
  distribution_hint: string | null;
};

export type TopicMetricsPayload = {
  active_prediction_count: number;
  visible_post_count: number;
  time_label: string | null;
};

export type TopicDiscussionPayload = {
  excerpt_type: string | null;
  excerpt_title: string | null;
  excerpt_text: string | null;
  excerpt_created_at: string | null;
};

export type TopicCardRewardPayload = {
  primary_card_slug: string;
  primary_card_label: string;
  primary_card_rarity: string;
  additional_count: number;
};

export type TopicResolutionPayload = {
  resolution_status: string | null;
  resolved_label: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  source_label: string | null;
  source_url: string | null;
};

export type TopicCardPayload = {
  topic_id: string;
  topic_slug: string;
  topic_title: string;
  topic_description: string | null;
  derived_lifecycle_state: string;
  topic_status: string;
  visibility: string;
  is_sensitive: boolean;
  space_id: string | null;
  space_slug: string | null;
  space_name: string | null;
  primary_taxonomy_slug: string | null;
  primary_taxonomy_label: string | null;
  prediction_type: string | null;
  prediction_question_title: string | null;
  aggregate_payload: TopicAggregatePayload;
  metrics_payload: TopicMetricsPayload;
  discussion_payload: TopicDiscussionPayload;
  card_payload: TopicCardRewardPayload | null;
  resolution_payload: TopicResolutionPayload;
  feed_reason_code: string;
  feed_reason_label: string;
  editorial_feed_score: number;
};

export type HomeFeedTopicView = {
  topic_id: string;
  topic_slug: string;
  topic_title: string;
  topic_description: string | null;
  topic_status: string;
  derived_lifecycle_state: string;
  visibility: string;
  is_sensitive: boolean;
  space_id: string | null;
  space_slug: string | null;
  space_name: string | null;
  primary_taxonomy_slug: string | null;
  primary_taxonomy_label: string | null;
  prediction_type: string | null;
  prediction_question_title: string | null;
  aggregate_payload: TopicAggregatePayload;
  metrics_payload: TopicMetricsPayload;
  discussion_payload: TopicDiscussionPayload;
  card_payload: TopicCardRewardPayload | null;
  resolution_payload: TopicResolutionPayload;
  last_activity_at: string | null;
  open_at: string | null;
  close_at: string | null;
  resolve_deadline_at: string | null;
  resolved_at: string | null;
  visible_post_count: number | null;
  active_prediction_count: number | null;
  activity_score_raw: number;
  freshness_score_raw: number;
  participation_score_raw: number;
  resolution_proximity_score_raw: number;
  editorial_priority_score_raw: number;
  shift_score_raw: number;
  editorial_feed_score: number;
  feed_reason_code: string;
  feed_reason_label: string;
  editorial_feed_rank: number;
  topic_card_payload: TopicCardPayload;
};

export type TopicSummaryView = {
  id: string;
  space_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  topic_status: string;
  effective_visibility: string;
  open_at: string;
  close_at: string;
  created_at: string;
  visible_post_count: number | null;
  active_prediction_count: number | null;
};

export type TopicPredictionAggregateView = {
  topic_id: string;
  prediction_type: string;
  submission_count: number | null;
  numeric_average: number | null;
  numeric_median: number | null;
  binary_yes_ratio: number | null;
};

export type PublicPollResultsView = {
  poll_id: string;
  poll_question_id: string;
  poll_option_id: string | null;
  option_label: string | null;
  response_count: number | null;
};

export type PublicCardShowcaseView = {
  user_id: string;
  card_id: string;
  quantity: number;
  first_granted_at: string;
};

export type TerritoryTopicRollupView = {
  territory_id: string;
  topic_count: number | null;
};

export type TerritoryPredictionRollupView = {
  territory_id: string;
  prediction_count: number | null;
};

export type MyPredictionHistoryView = {
  id: string;
  submission_id: string;
  topic_id: string;
  user_id: string;
  submission_status: string;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_numeric: number | null;
  answer_option_id: string | null;
  answer_ordinal: number | null;
  recorded_at: string;
};

export type PrivateVoteHistoryView = {
  id: string;
  vote_round: number | null;
  declared_option_label: string;
  declared_candidate_name: string | null;
  declared_at: string;
};

export type MyReputationSummaryView = {
  user_id: string;
  total_reputation: number | null;
  event_count: number | null;
};

export type MyCardInventoryView = {
  id: string;
  user_id: string;
  card_id: string;
  quantity: number;
  first_granted_at: string;
  last_granted_at: string;
};

export type SpaceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  space_type: string;
  space_status: string;
  visibility: string;
  created_at: string;
};

export type TopicRow = {
  id: string;
  space_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  topic_status: string;
  visibility: string;
  open_at: string;
  close_at: string;
  created_at: string;
};

export type PredictionQuestionRow = {
  topic_id: string;
  prediction_type: string;
  title: string;
  unit_label: string | null;
  allow_submission_update: boolean;
};

export type PredictionOptionRow = {
  id: string;
  topic_id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type PostRow = {
  id: string;
  topic_id: string | null;
  space_id: string | null;
  post_type: string;
  post_status: string;
  title: string | null;
  body_markdown: string;
  created_at: string;
};

export type PollRow = {
  id: string;
  topic_id: string | null;
  space_id: string | null;
  title: string;
  description: string | null;
  poll_status: string;
  visibility: string;
  open_at: string;
  close_at: string;
};

export type PollQuestionRow = {
  id: string;
  poll_id: string;
  prompt: string;
  question_type: string;
  sort_order: number;
};

export type PollOptionRow = {
  id: string;
  poll_question_id: string;
  label: string;
  sort_order: number;
};

export type CardCatalogRow = {
  id: string;
  family_id: string;
  slug: string;
  label: string;
  description: string | null;
  rarity: string;
  is_stackable: boolean;
  is_active: boolean;
};

export type ThreadPostView = {
  id: string;
  thread_id: string;
  type: string;
  title: string | null;
  content: string | null;
  entity_slug: string | null;
  entity_name: string | null;
  created_by: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  upvote_weight: number | null;
  downvote_weight: number | null;
  weighted_votes: number | null;
  comment_count: number | null;
};

export type CommentView = {
  id: string;
  thread_id: string;
  thread_post_id: string | null;
  parent_post_id: string | null;
  depth: number;
  author_user_id: string;
  username: string | null;
  display_name: string | null;
  title: string | null;
  body_markdown: string;
  created_at: string;
  updated_at: string;
  post_status: string;
  upvote_weight: number | null;
  downvote_weight: number | null;
  comment_score: number | null;
};

export type LeaderboardEntryView = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  global_score?: number | null;
  local_score?: number | null;
  analytic_score?: number | null;
  global_rank?: number | null;
  local_rank?: number | null;
  entity_id?: string | null;
  entity_slug?: string | null;
  entity_name?: string | null;
  updated_at?: string | null;
};

export type ThreadFeedItemView = HomeFeedTopicView;
export type ThreadSummaryView = TopicSummaryView;
export type ThreadPredictionAggregateView = TopicPredictionAggregateView;
export type ThreadRow = TopicRow;

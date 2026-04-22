export interface PublicProfileView {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  created_at: string;
}

export interface TopicDiscussionPayload {
  excerpt_type: string | null;
  excerpt_title: string | null;
  excerpt_text: string | null;
  excerpt_created_at: string | null;
}

export interface TopicResolutionPayload {
  resolution_status: string | null;
  resolved_label: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  source_label: string | null;
  source_url: string | null;
}

export interface TopicCardPayload {
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
  discussion_payload: TopicDiscussionPayload;
  resolution_payload: TopicResolutionPayload;
  feed_reason_code: string;
  feed_reason_label: string;
  editorial_feed_score: number;
}

export interface HomeFeedTopicView {
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
  discussion_payload: TopicDiscussionPayload;
  resolution_payload: TopicResolutionPayload;
  last_activity_at: string | null;
  open_at: string | null;
  close_at: string | null;
  resolve_deadline_at: string | null;
  resolved_at: string | null;
  visible_post_count: number | null;
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
  feed_post_id?: string | null;
  feed_post_content?: string | null;
  feed_author_username?: string | null;
  feed_author_display_name?: string | null;
  feed_gauche_count?: number | null;
  feed_droite_count?: number | null;
  feed_comment_count?: number | null;
  feed_user_reaction_side?: 'gauche' | 'droite' | null;
  feed_poll_summary?: PostPollSummaryView | null;
  feed_subjects?: { slug: string; name: string; emoji: string | null }[] | null;
  feed_party_tags?: string[] | null;
}

export interface TopicSummaryView {
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
}

export interface PublicPollResultsView {
  poll_id: string;
  poll_question_id: string;
  poll_option_id: string | null;
  option_label: string | null;
  response_count: number | null;
}

export interface PostPollOptionSummary {
  option_id: string;
  label: string;
  sort_order: number;
}

export interface PostPollResultPoint {
  option_id: string;
  option_label: string;
  sort_order: number;
  response_count?: number;
  weighted_count?: number;
  share: number;
}

export interface PostPollSummaryView {
  post_item_id: string;
  post_id: string;
  post_slug: string;
  post_title: string;
  question: string;
  deadline_at: string;
  poll_status: 'open' | 'closed';
  sample_size: number;
  effective_sample_size: number;
  representativity_score: number;
  coverage_score: number;
  distance_score: number;
  stability_score: number;
  anti_brigading_score: number;
  raw_results: PostPollResultPoint[];
  corrected_results: PostPollResultPoint[];
  options: PostPollOptionSummary[];
  selected_option_id: string | null;
}

export interface SpaceRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  space_type: string;
  space_status: string;
  visibility: string;
  created_at: string;
}

export interface TopicRow {
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
}

export interface PostRow {
  id: string;
  topic_id: string | null;
  space_id: string | null;
  post_type: string;
  post_status: string;
  title: string | null;
  body_markdown: string;
  created_at: string;
}

export interface PollRow {
  id: string;
  topic_id: string | null;
  space_id: string | null;
  title: string;
  description: string | null;
  poll_status: string;
  visibility: string;
  open_at: string;
  close_at: string;
}

export interface PollQuestionRow {
  id: string;
  poll_id: string;
  prompt: string;
  question_type: string;
  sort_order: number;
}

export interface PollOptionRow {
  id: string;
  poll_question_id: string;
  label: string;
  sort_order: number;
}

export interface PostView {
  id: string;
  post_id: string;
  thread_id?: string;
  type: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  entity_slug: string | null;
  entity_name: string | null;
  created_by: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  gauche_count: number | null;
  droite_count: number | null;
  user_reaction_side?: 'gauche' | 'droite' | null;
  weighted_votes: number | null;
  comment_count: number | null;
  poll_summary?: PostPollSummaryView | null;
}

export interface CommentView {
  id: string;
  post_id: string;
  post_item_id: string | null;
  thread_id?: string;
  thread_post_id?: string | null;
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
  gauche_count: number | null;
  droite_count: number | null;
  user_reaction_side?: 'gauche' | 'droite' | null;
  comment_score: number | null;
}

export interface LeaderboardEntryView {
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
}

export interface PrivateVoteHistoryView {
  id: string;
  vote_round: number | null;
  declared_option_label: string;
  declared_candidate_name: string | null;
  declared_at: string;
}

export type PostFeedItemView = HomeFeedTopicView;
export type PostSummaryView = TopicSummaryView;
export type PostRowView = TopicRow;

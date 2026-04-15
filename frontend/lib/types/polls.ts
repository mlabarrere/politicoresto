import type { PostPollSummaryView } from "@/lib/types/views";

export type PollExplorerFilter = "active" | "closed" | "answered" | "unanswered";
export type PollExplorerSort =
  | "representativity"
  | "popularity"
  | "newest"
  | "deadline_soon";

export type PollCardInlineProps = {
  poll: PostPollSummaryView;
  isAuthenticated: boolean;
  onVoted?: (next: PostPollSummaryView) => void;
};

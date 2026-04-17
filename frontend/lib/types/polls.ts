import type { PostPollSummaryView } from "@/lib/types/views";

export type PollCardInlineProps = {
  poll: PostPollSummaryView;
  isAuthenticated: boolean;
  onVoted?: (next: PostPollSummaryView) => void;
};

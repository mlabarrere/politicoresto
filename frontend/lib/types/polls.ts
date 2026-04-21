import type { PostPollSummaryView } from '@/lib/types/views';

export interface PollCardInlineProps {
  poll: PostPollSummaryView;
  isAuthenticated: boolean;
  onVoted?: (next: PostPollSummaryView) => void;
}

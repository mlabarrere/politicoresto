"use client";

import { PollCardInline } from "@/components/poll/poll-card-inline";
import type { PostPollSummaryView } from "@/lib/types/views";

export function PollDetailBlock({
  poll,
  isAuthenticated
}: {
  poll: PostPollSummaryView;
  isAuthenticated: boolean;
}) {
  return <PollCardInline poll={poll} isAuthenticated={isAuthenticated} />;
}

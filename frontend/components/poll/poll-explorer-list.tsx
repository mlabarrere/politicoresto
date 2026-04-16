"use client";

import { useMemo, useState } from "react";

import { AppCard } from "@/components/app/app-card";
import { AppPollFeedItem } from "@/components/app/app-feed-item";
import { PollFilterBar } from "@/components/poll/poll-filter-bar";
import { PollSortControl } from "@/components/poll/poll-sort-control";
import type { PollExplorerFilter, PollExplorerSort } from "@/lib/types/polls";
import type { PostPollSummaryView } from "@/lib/types/views";

function sortRows(rows: PostPollSummaryView[], sort: PollExplorerSort) {
  const next = [...rows];
  next.sort((a, b) => {
    if (sort === "popularity") return b.sample_size - a.sample_size;
    if (sort === "newest") return b.post_item_id.localeCompare(a.post_item_id);
    if (sort === "deadline_soon") {
      return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
    }
    return b.representativity_score - a.representativity_score;
  });
  return next;
}

function filterRows(
  rows: PostPollSummaryView[],
  filter: PollExplorerFilter
) {
  if (filter === "active") return rows.filter((row) => row.poll_status === "open");
  if (filter === "closed") return rows.filter((row) => row.poll_status === "closed");
  if (filter === "answered") return rows.filter((row) => Boolean(row.selected_option_id));
  if (filter === "unanswered") return rows.filter((row) => !row.selected_option_id);
  return rows;
}

export function PollExplorerList({ rows }: { rows: PostPollSummaryView[] }) {
  const [filter, setFilter] = useState<PollExplorerFilter>("active");
  const [sort, setSort] = useState<PollExplorerSort>("representativity");

  const visibleRows = useMemo(() => sortRows(filterRows(rows, filter), sort), [rows, filter, sort]);

  if (!rows.length) {
    return (
      <AppCard className="p-4">
        <p className="text-sm text-muted-foreground">Aucun sondage public pour le moment.</p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-3">
      <AppCard className="space-y-3 p-3">
        <PollFilterBar value={filter} onChange={setFilter} />
        <PollSortControl value={sort} onChange={setSort} />
      </AppCard>

      {visibleRows.map((row) => (
        <AppPollFeedItem key={row.post_item_id} row={row} />
      ))}
    </div>
  );
}

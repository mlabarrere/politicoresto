"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppCard } from "@/components/app/app-card";
import { PollFilterBar } from "@/components/poll/poll-filter-bar";
import { PollSortControl } from "@/components/poll/poll-sort-control";
import { PollStatusBadge } from "@/components/poll/poll-status-badge";
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
        <AppCard key={row.post_item_id} className="space-y-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{row.question}</p>
            <PollStatusBadge status={row.poll_status} />
          </div>
          <p className="text-xs text-muted-foreground">
            Representativite {row.representativity_score.toFixed(1)} / 100 - Panel {row.sample_size}
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href={`/post/${row.post_slug}`} className="font-medium text-foreground hover:underline">
              Ouvrir detail
            </Link>
            <Link href={`/post/${row.post_slug}`} className="font-medium text-foreground hover:underline">
              Ouvrir post source
            </Link>
          </div>
        </AppCard>
      ))}
    </div>
  );
}

"use client";

import { AppFilterBar } from "@/components/app/app-filter-bar";
import type { PollExplorerFilter } from "@/lib/types/polls";

const FILTERS: Array<{ value: PollExplorerFilter; label: string }> = [
  { value: "active", label: "Actifs" },
  { value: "closed", label: "Clos" },
  { value: "answered", label: "Repondus" },
  { value: "unanswered", label: "Sans reponse" }
];

export function PollFilterBar({
  value,
  onChange
}: {
  value: PollExplorerFilter;
  onChange: (next: PollExplorerFilter) => void;
}) {
  return <AppFilterBar options={FILTERS} value={value} onChange={onChange} className="flex flex-wrap gap-2" />;
}

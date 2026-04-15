"use client";

import { AppFilter } from "@/components/app/app-filter";
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
  return <AppFilter options={FILTERS} value={value} onChange={onChange} className="flex flex-wrap gap-2" />;
}

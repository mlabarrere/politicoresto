"use client";

import { AppSelect } from "@/components/app/app-select";
import type { PollExplorerSort } from "@/lib/types/polls";

export function PollSortControl({
  value,
  onChange
}: {
  value: PollExplorerSort;
  onChange: (next: PollExplorerSort) => void;
}) {
  return (
    <AppSelect
      value={value}
      onChange={(event) => onChange(event.target.value as PollExplorerSort)}
      className="w-full sm:w-auto"
    >
      <option value="representativity">Representativite</option>
      <option value="popularity">Popularite</option>
      <option value="newest">Plus recent</option>
      <option value="deadline_soon">Deadline proche</option>
    </AppSelect>
  );
}

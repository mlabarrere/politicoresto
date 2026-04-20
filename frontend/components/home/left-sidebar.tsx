"use client";

import { AppCard } from "@/components/app/app-card";
import { cn } from "@/lib/utils";
import type { CategoryFilter } from "@/lib/types/homepage";

const PARTY_FILTERS = [
  { slug: "lfi", label: "🔴 LFI" },
  { slug: "ps", label: "🌹 PS" },
  { slug: "ecologistes", label: "🌿 Écologistes" },
  { slug: "renaissance", label: "🟡 Renaissance" },
  { slug: "lr", label: "🔵 LR" },
  { slug: "rn", label: "⬛ RN" },
];

interface LeftSidebarProps {
  activeFilter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
}
function isActive(filter: CategoryFilter, current: CategoryFilter): boolean {
  if (!filter || !current) return filter === current;
  if (filter.type !== current.type) return false;
  if (filter.type === "sondage" && current.type === "sondage") return filter.status === current.status;
  if (filter.type === "politique" && current.type === "politique") return filter.blocSlug === current.blocSlug;
  if (filter.type === "parti" && current.type === "parti") return filter.slug === current.slug;
  if (filter.type === "subject" && current.type === "subject") return filter.slug === current.slug;
  return false;
}

function FilterButton({
  label,
  filter,
  activeFilter,
  onFilterChange
}: {
  label: string;
  filter: CategoryFilter;
  activeFilter: CategoryFilter;
  onFilterChange: (f: CategoryFilter) => void;
}) {
  const active = isActive(filter, activeFilter);
  return (
    <button
      type="button"
      onClick={() => { onFilterChange(active ? null : filter); }}      className={cn(
        "w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-foreground hover:bg-muted/70"
      )}
    >
      {label}
    </button>
  );
}

export function LeftSidebar({ activeFilter, onFilterChange }: LeftSidebarProps) {
  return (
    <aside className="hidden xl:block">
      <AppCard className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sondages</p>
        <div className="mt-3 space-y-2">
          <FilterButton
            label="En cours"
            filter={{ type: "sondage", status: "open" }}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
          <FilterButton
            label="Passé"
            filter={{ type: "sondage", status: "closed" }}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partis</p>
        <div className="mt-3 space-y-2">
          {PARTY_FILTERS.map((party) => (
            <FilterButton
              key={party.slug}
              label={party.label}
              filter={{ type: "parti", slug: party.slug }}
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
            />
          ))}
        </div>
      </AppCard>
    </aside>
  );
}

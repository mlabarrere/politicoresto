"use client";

import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";

import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { AppFilterBar } from "@/components/app/app-filter-bar";
import type { RightSidebarProps } from "@/lib/types/forum-components";

const SORT_OPTIONS: Array<{ value: "top" | "recent" | "oldest"; label: string }> = [
  { value: "top", label: "Populaires" },
  { value: "recent", label: "Recentes" },
  { value: "oldest", label: "Anciennes" }
];

export function RightSidebar({ sortMode, totalComments, onSortChange }: RightSidebarProps) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-24" aria-label="Navigation du post">
      <AppCard className="p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tri</p>
        <AppFilterBar className="mt-2 grid gap-2" options={SORT_OPTIONS} value={sortMode} onChange={onSortChange} />
      </AppCard>

      <AppCard className="p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metadonnees</p>
        <p className="mt-2 text-sm text-foreground">{totalComments} commentaires</p>
      </AppCard>

      <AppCard className="p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Navigation rapide</p>
        <div className="mt-2 grid gap-2">
          <AppButton type="button" variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ArrowUpToLine className="size-3.5" /> Haut
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
          >
            <ArrowDownToLine className="size-3.5" /> Bas
          </AppButton>
        </div>
      </AppCard>
    </aside>
  );
}

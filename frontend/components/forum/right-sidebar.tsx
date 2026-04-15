"use client";

import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RightSidebarProps } from "@/lib/types/forum-components";

export function RightSidebar({ sortMode, totalComments, onSortChange }: RightSidebarProps) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-24" aria-label="Navigation du thread">
      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tri</p>
        <div className="mt-2 grid gap-2">
          {([
            ["top", "Populaires"],
            ["recent", "Récentes"],
            ["oldest", "Anciennes"]
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={sortMode === value ? "default" : "outline"}
              onClick={() => onSortChange(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Métadonnées</p>
        <p className="mt-2 text-sm text-foreground">{totalComments} commentaires</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Navigation rapide</p>
        <div className="mt-2 grid gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ArrowUpToLine className="size-3.5" /> Haut
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
          >
            <ArrowDownToLine className="size-3.5" /> Bas
          </Button>
        </div>
      </section>
    </aside>
  );
}


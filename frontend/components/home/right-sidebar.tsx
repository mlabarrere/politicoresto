import Link from "next/link";

import { CreateThreadCTA } from "@/components/home/create-thread-cta";
import type { FeedSortMode } from "@/lib/types/homepage";

export function RightSidebar({
  sortMode,
  threadCount
}: {
  sortMode: FeedSortMode;
  threadCount: number;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-3">
        <section className="rounded-2xl border border-border bg-card p-3">
          <CreateThreadCTA />
        </section>

        <section className="rounded-2xl border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etat du feed</p>
          <p className="mt-2 text-sm text-foreground">{threadCount} threads visibles</p>
          <p className="mt-1 text-xs text-muted-foreground">Tri actif: {sortMode}</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Raccourcis</p>
          <div className="mt-2 space-y-2 text-sm">
            <Link href="/thread/new" className="block text-foreground hover:underline">
              Nouveau thread
            </Link>
            <Link href="/me" className="block text-foreground hover:underline">
              Mon profil
            </Link>
            <Link href="/thread/new?draft=1" className="block text-foreground hover:underline">
              Brouillons
            </Link>
          </div>
        </section>
      </div>
    </aside>
  );
}


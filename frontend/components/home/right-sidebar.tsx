import Link from "next/link";
import type { Route } from "next";

import { AppCard } from "@/components/app/app-card";
import type { FeedSortMode } from "@/lib/types/homepage";

export function RightSidebar({
  sortMode,
  postCount
}: {
  sortMode: FeedSortMode;
  postCount: number;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-3">
        <AppCard className="p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etat du feed</p>
          <p className="mt-2 text-sm text-foreground">{postCount} posts visibles</p>
          <p className="mt-1 text-xs text-muted-foreground">Tri actif: {sortMode}</p>
        </AppCard>

        <AppCard className="p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Raccourcis</p>
          <div className="mt-2 space-y-2 text-sm">
            <Link href={"/polls" as Route} className="block text-foreground hover:underline">
              Explorer les sondages
            </Link>
            <Link href="/me" className="block text-foreground hover:underline">
              Mon profil
            </Link>
          </div>
        </AppCard>
      </div>
    </aside>
  );
}

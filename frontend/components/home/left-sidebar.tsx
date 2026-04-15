import Link from "next/link";
import type { Route } from "next";

import { politicalBlocs } from "@/lib/data/political-taxonomy";
import { cn } from "@/lib/utils";

export function LeftSidebar({ selectedBloc }: { selectedBloc: string | null }) {
  return (
    <aside className="hidden xl:block">
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
        <div className="mt-3 space-y-2">
          <Link
            href="/"
            className={cn(
              "block rounded-xl px-3 py-2 text-sm transition hover:bg-muted hover:text-foreground",
              !selectedBloc ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            Tous les sujets
          </Link>

          {politicalBlocs.map((bloc) => {
            const active = selectedBloc === bloc.slug;
            return (
              <Link
                key={bloc.slug}
                href={`/category/${encodeURIComponent(bloc.slug)}` as Route}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm transition hover:bg-muted hover:text-foreground",
                  active ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="block">{bloc.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{bloc.description}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </aside>
  );
}


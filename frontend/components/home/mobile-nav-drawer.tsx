"use client";

import Link from "next/link";
import type { Route } from "next";
import { Menu } from "lucide-react";

import { AppButton } from "@/components/app/app-button";
import { AppDrawer } from "@/components/app/app-drawer";
import { politicalBlocs } from "@/lib/data/political-taxonomy";
import { cn } from "@/lib/utils";

export function MobileNavDrawer({ selectedBloc }: { selectedBloc: string | null }) {
  return (
    <div className="xl:hidden">
      <AppDrawer
        side="left"
        title="Categories"
        trigger={
          <AppButton variant="secondary" size="sm" aria-label="Ouvrir les categories" icon={<Menu className="size-4" />}>
            Categories
          </AppButton>
        }
      >
        <div className="mt-2 space-y-2">
          <Link
            href="/"
            className={cn(
              "block rounded-xl px-3 py-2 text-sm transition hover:bg-muted hover:text-foreground",
              !selectedBloc ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            Tous les sujets
          </Link>
          <Link
            href={"/polls" as Route}
            className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Sondages
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
                {bloc.label}
              </Link>
            );
          })}
        </div>
      </AppDrawer>
    </div>
  );
}

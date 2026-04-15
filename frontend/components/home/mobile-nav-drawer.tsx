"use client";

import Link from "next/link";
import type { Route } from "next";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { politicalBlocs } from "@/lib/data/political-taxonomy";
import { cn } from "@/lib/utils";

export function MobileNavDrawer({ selectedBloc }: { selectedBloc: string | null }) {
  return (
    <div className="xl:hidden">
      <Sheet>
        <SheetTrigger render={<Button variant="outline" size="sm" aria-label="Ouvrir les categories" />}>
          <Menu className="size-4" />
          Categories
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] bg-card">
          <SheetTitle className="text-lg font-semibold tracking-tight">Categories</SheetTitle>
          <div className="mt-4 space-y-2">
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
                  {bloc.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}


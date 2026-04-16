"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AppCard } from "@/components/app/app-card";
import type { AccountSectionKey } from "@/lib/account/sections";
import { cn } from "@/lib/utils";

type SectionItem = {
  key: AccountSectionKey;
  label: string;
  description: string;
};

export function AppSectionNav({ items }: { items: SectionItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("section") ?? "profile") as AccountSectionKey;

  return (
    <>
      <AppCard className="hidden p-2 lg:block">
        <nav className="space-y-1" aria-label="Navigation espace personnel">
          {items.map((item) => {
            const active = current === item.key;
            return (
              <Link
                key={item.key}
                href={{ pathname, query: { section: item.key } }}
                className={cn(
                  "block rounded-xl border px-3 py-3 transition",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent bg-background text-foreground hover:border-border hover:bg-secondary"
                )}
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className={cn("mt-1 text-xs", active ? "text-background/80" : "text-muted-foreground")}>{item.description}</p>
              </Link>
            );
          })}
        </nav>
      </AppCard>

      <div className="lg:hidden">
        <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Navigation espace personnel mobile">
          {items.map((item) => {
            const active = current === item.key;
            return (
              <Link
                key={item.key}
                href={{ pathname, query: { section: item.key } }}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

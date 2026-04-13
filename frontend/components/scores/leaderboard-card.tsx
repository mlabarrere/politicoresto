import Link from "next/link";
import type { Route } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardEntryView } from "@/lib/types/views";
import { formatNumber } from "@/lib/utils/format";

export function LeaderboardCard({
  title,
  eyebrow,
  rows,
  href
}: {
  title: string;
  eyebrow?: string;
  rows: LeaderboardEntryView[];
  href?: Route;
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <CardTitle className="mt-1 text-base font-semibold">{title}</CardTitle>
          </div>
          {href ? (
            <Link href={href} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Voir tout
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {rows.length ? (
          rows.map((row, index) => {
            const rank = row.global_rank ?? row.local_rank ?? index + 1;
            const score = row.global_score ?? row.local_score ?? row.analytic_score ?? 0;

            return (
              <div
                key={`${row.user_id}-${rank}`}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">#{rank}</p>
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.display_name ?? row.username ?? "Analyste"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">{formatNumber(score)}</p>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
            Aucun score visible.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

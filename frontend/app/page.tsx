import Link from "next/link";
import type { Route } from "next";

import { Composer } from "@/components/compose/composer";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { LeaderboardCard } from "@/components/scores/leaderboard-card";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatusBadge } from "@/components/ui/status-badge";
import { getHomeScreenData } from "@/lib/data/public/home";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const { data, error } = await getHomeScreenData();
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return (
    <PageContainer>
      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-4">
            <p className="eyebrow">Navigation</p>
            <div className="mt-3 space-y-2">
              <Link
                href="/"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "flex w-full justify-start rounded-2xl bg-muted px-3 text-foreground"
                )}
              >
                Feed global
              </Link>
              {data.featuredSpaces.map((space) => (
                <Link
                  key={space.id}
                  href={`/space/${space.slug}`}
                  className="block rounded-2xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {space.name}
                </Link>
              ))}
            </div>
          </div>

          {session ? <Composer redirectPath="/" title="Nouveau thread" /> : null}
        </aside>

        <main className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="Global" tone="info" />
              <StatusBadge label="Presidentielle" tone="muted" />
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
              Feed politique
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Threads, sondages, paris, commentaires. Une seule surface. Des espaces de camp autour.
            </p>
          </section>

          {error ? (
            <EmptyState
              title="Feed partiel"
              body={`Lecture incomplete: ${error}`}
            />
          ) : null}

          {data.feed.length ? (
            <FeedList items={data.feed} featuredCount={2} />
          ) : (
            <EmptyState
              title="Aucun thread visible"
              body="Le feed apparaitra ici des que les premiers threads publics seront publies."
            />
          )}
        </main>

        <aside className="space-y-4">
          <LeaderboardCard
            title="Analystes"
            eyebrow="Global"
            rows={data.leaderboard}
            href={"/leaderboard" as Route}
          />

          <div className="rounded-3xl border border-border bg-card p-4">
            <p className="eyebrow">Watchlist</p>
            <div className="mt-3 space-y-3">
              {data.watchlist.length ? (
                data.watchlist.map((item) => (
                  <Link
                    key={item.topic_id}
                    href={`/thread/${item.topic_slug}` as Route}
                    className="block rounded-2xl border border-border px-3 py-3 transition hover:bg-muted"
                  >
                    <p className="text-sm font-medium text-foreground">{item.topic_title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.feed_reason_label}</p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucun signal urgent.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

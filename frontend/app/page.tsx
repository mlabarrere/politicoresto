import Link from "next/link";
import { Compass, MapPinned, Sparkles, Trophy } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { TopicCard } from "@/components/topics/topic-card";
import { buttonVariants } from "@/components/ui/button-variants";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/lib/config/site";
import { getHomeScreenData } from "@/lib/data/public/home";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const { data, error } = await getHomeScreenData();
  const featuredTopics = data.feed.slice(0, 2);
  const feedTopics = data.feed.slice(2);
  const resolvedTopics = data.watchlist
    .filter((topic) => topic.feed_reason_code === "recently_resolved")
    .slice(0, 3);
  const urgentTopics = data.watchlist
    .filter((topic) => topic.feed_reason_code !== "recently_resolved")
    .slice(0, 3);
  const unlockableCards = data.cards.slice(0, 3);

  return (
    <PageContainer>
      <div className="space-y-8">
        <section className="soft-panel p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow text-primary">Accueil</p>
                <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-primary">
                  Sujets, discussions, territoires et resultats
                </span>
              </div>
              <div className="space-y-4">
                <h1 className="editorial-title max-w-4xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                  Suivez les sujets publics qui comptent.
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                  Politicoresto rassemble des sujets clairs, des discussions lisibles, des
                  reperes locaux et des resultats a revoir dans le temps.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/topics" className={cn(buttonVariants({ size: "lg" }))}>
                  Voir les sujets
                </Link>
                <Link
                  href="/territories"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Explorer les territoires
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="eyebrow">Ce que vous lisez ici</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Des sujets clairs, pas un fil de commentaires sans cadre.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="eyebrow">Ce qui remonte</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Activite, territoire, cloture proche ou resultat attendu.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="eyebrow">Pourquoi revenir</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Pour retrouver les sujets qui bougent, se resolvent ou debloquent des cartes.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/60 p-5">
              <p className="eyebrow">En bref</p>
              <div className="mt-4 grid gap-4 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <Compass className="mt-0.5 size-4 text-sky-700" />
                  <div>
                    <p className="font-semibold text-foreground">Du local au national</p>
                    <p>Les sujets se lisent par territoire, par espace et par moment cle.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Des priorites visibles</p>
                    <p>Chaque sujet remonte pour une raison simple et lisible.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Trophy className="mt-0.5 size-4 text-amber-700" />
                  <div>
                    <p className="font-semibold text-foreground">Des cartes en soutien</p>
                    <p>La progression reste visible sans prendre le dessus sur les sujets.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="space-y-6">
            <SectionCard title="Explorer" eyebrow="Navigation">
              <div className="grid gap-3">
                <Link
                  href="/topics"
                  className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Tous les sujets
                </Link>
                <Link
                  href="/spaces"
                  className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Espaces
                </Link>
                <Link
                  href="/territories"
                  className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Territoires
                </Link>
                <Link
                  href="/cards"
                  className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Cartes
                </Link>
              </div>
            </SectionCard>

            <SectionCard title="Pres de vous" eyebrow="Territoires">
              {data.territories.length ? (
                <div className="space-y-3">
                  {data.territories.slice(0, 3).map((topic) => (
                    <div
                      key={`${topic.primary_territory_slug}-${topic.topic_id}`}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <p className="font-semibold text-foreground">
                        {topic.primary_territory_name ?? "Territoire non renseigne"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{topic.topic_title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Les reperes locaux arrivent"
                  body="Les premiers sujets locaux apparaitront ici des que des territoires visibles remonteront dans le feed."
                  actionHref="/territories"
                  actionLabel="Ouvrir les territoires"
                />
              )}
            </SectionCard>

            <SectionCard title="Themes suivis" eyebrow="Explorer">
              <div className="flex flex-wrap gap-2">
                {siteConfig.editorialTabs.map((tab) => (
                  <span
                    key={tab}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </SectionCard>
          </aside>

          <div className="space-y-6">
            {error ? (
              <EmptyState
                title="Le flux principal est partiellement disponible"
                body={`Certaines donnees ne sont pas encore lisibles, mais l'exploration reste possible: ${error}`}
                actionHref="/topics"
                actionLabel="Voir les sujets"
              />
            ) : null}

            {data.feed.length ? (
              <>
                <section className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">A la une</p>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        Les sujets a ouvrir en premier
                      </h2>
                    </div>
                    <Link href="/topics" className="text-sm font-semibold text-primary">
                      Voir tous les sujets
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {featuredTopics.map((topic) => (
                      <TopicCard key={topic.topic_id} topic={topic} featured />
                    ))}
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <div className="space-y-1">
                    <p className="eyebrow">Sujets</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Le fil principal
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {feedTopics.map((topic) => (
                      <TopicCard key={topic.topic_id} topic={topic} />
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <EmptyState
                title="Les sujets arrivent"
                body="Cette page affichera ici les sujets publics les plus utiles a lire et a suivre."
                actionHref="/topics"
                actionLabel="Voir les sujets"
              />
            )}
          </div>

          <aside className="space-y-6">
            <SectionCard
              title="A surveiller"
              eyebrow="A suivre"
              aside={<MapPinned className="size-5 text-primary" />}
            >
              {urgentTopics.length ? (
                <div className="space-y-3">
                  {urgentTopics.map((topic) => (
                    <Link
                      key={topic.topic_id}
                      href={`/topic/${topic.topic_slug}`}
                      className="block rounded-lg border border-border bg-background p-4 transition hover:bg-secondary"
                    >
                      <p className="font-semibold text-foreground">{topic.topic_title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{topic.feed_reason_label}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Rien d'urgent pour le moment"
                  body="Quand un sujet approche d'une cloture ou d'un resultat, il remontera ici."
                />
              )}
            </SectionCard>

            <SectionCard title="Derniers resultats" eyebrow="Resultats">
              {resolvedTopics.length ? (
                <div className="space-y-3">
                  {resolvedTopics.map((topic) => (
                    <Link
                      key={topic.topic_id}
                      href={`/topic/${topic.topic_slug}`}
                      className="block rounded-lg border border-emerald-200 bg-emerald-50 p-4 transition hover:bg-emerald-100/60"
                    >
                      <p className="font-semibold text-foreground">{topic.topic_title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {topic.resolution_payload?.resolved_label
                          ? `Resultat: ${topic.resolution_payload.resolved_label}`
                          : "Resultat publie"}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Les resultats apparaitront ici"
                  body="Les sujets resolus remonteront ici pour rester faciles a retrouver."
                />
              )}
            </SectionCard>

            <SectionCard title="Cartes a debloquer" eyebrow="Progression">
              {unlockableCards.length ? (
                <div className="space-y-3">
                  {unlockableCards.map((topic) => (
                    <div
                      key={`${topic.topic_id}-${topic.card_payload?.primary_card_slug}`}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                    >
                      <p className="font-semibold text-foreground">
                        {topic.card_payload?.primary_card_label ?? "Carte visible"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{topic.topic_title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Les cartes apparaitront ici"
                  body="Les cartes liees aux sujets visibles apparaitront ici au fil de vos lectures."
                  actionHref="/cards"
                  actionLabel="Voir le catalogue"
                />
              )}
            </SectionCard>

            <SectionCard title="Pres de vous" eyebrow="Local">
              {data.territories.length ? (
                <div className="space-y-3">
                  {data.territories.map((topic) => (
                    <div
                      key={`${topic.primary_territory_slug}-${topic.topic_id}`}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <p className="font-semibold text-foreground">
                        {topic.primary_territory_name ?? "Territoire non renseigne"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{topic.topic_title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Les sujets locaux apparaitront ici"
                  body="Cette colonne mettra en avant les sujets lies a un territoire proche."
                />
              )}
            </SectionCard>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}

import { Sparkles, Trophy } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCardsScreenData } from "@/lib/data/public/cards";
import { formatDate, formatNumber } from "@/lib/utils/format";

export default async function CardsPage() {
  const { data, error } = await getCardsScreenData();

  return (
    <PageContainer>
      <div className="space-y-8">
        <section className="soft-panel p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Collection publique</p>
              <h1 className="editorial-title mt-3 text-4xl font-bold text-foreground">Cartes</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                Les cartes donnent une memoire visible a l'activite. Elles prolongent les sujets
                et les resolutions sans changer la nature civique du produit.
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{formatNumber(data.catalog.length)} cartes visibles</p>
              <p>Un catalogue public qui doit renvoyer vers les sujets actifs.</p>
            </div>
          </div>
        </section>

        <SectionCard title="Catalogue public" eyebrow="Familles et raretes" aside={<Sparkles className="size-5 text-primary" />}>
          {error ? (
            <div className="mb-5">
              <EmptyState
                title="Catalogue partiel"
                body={`Une partie de la vitrine reste indisponible: ${error}`}
              />
            </div>
          ) : null}

          {data.catalog.length ? (
            <ul className="grid gap-4 lg:grid-cols-2">
              {data.catalog.map((card) => (
                <li key={card.id} className="rounded-lg border border-border bg-background p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{card.label}</p>
                    <StatusBadge label={card.rarity} tone="accent" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {card.description ?? "Carte disponible pour enrichissement futur."}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Le catalogue se construit"
              body="Aucune carte active n'est encore visible dans cette vue publique."
            />
          )}
        </SectionCard>

        <SectionCard title="Vitrine publique" eyebrow="Inventaires visibles" aside={<Trophy className="size-5 text-amber-700" />}>
          {data.showcase.length ? (
            <div className="space-y-3">
              {data.showcase.map((item) => (
                <div
                  key={`${item.user_id}-${item.card_id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{item.user_id}</p>
                    <p className="text-sm text-muted-foreground">
                      Premiere attribution: {formatDate(item.first_granted_at)}
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">x{formatNumber(item.quantity)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="La preuve sociale apparaitra ici"
              body="Quand les inventaires publics seront exposes, cette page montrera qui collectionne deja."
            />
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

import { EmptyState } from "@/components/layout/empty-state";
import { SectionCard } from "@/components/layout/section-card";
import { getMyCardInventory } from "@/lib/data/authenticated/me";
import { formatDate } from "@/lib/utils/format";

export default async function MeCardsPage() {
  const { data, error } = await getMyCardInventory();

  return (
    <SectionCard title="Mes cartes" eyebrow="Inventaire personnel">
      {error ? (
        <EmptyState
          title="Inventaire indisponible"
          body={`La lecture de l'inventaire a echoue: ${error}`}
        />
      ) : data.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-background p-5 text-sm">
              <p className="font-semibold text-foreground">Carte {item.card_id}</p>
              <p className="mt-2 text-muted-foreground">Quantite: {item.quantity}</p>
              <p className="mt-2 text-muted-foreground">
                Derniere attribution: {formatDate(item.last_granted_at)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Inventaire vide"
          body="Vos premieres cartes apparaitront ici a mesure que les sujets se ferment, se resolvent ou declenchent des gains visibles."
        />
      )}
    </SectionCard>
  );
}

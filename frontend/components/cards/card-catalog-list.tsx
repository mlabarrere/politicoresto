import { Card, CardContent } from "@/components/ui/card";
import type { CardCatalogRow } from "@/lib/types/views";

export function CardCatalogList({ cards }: { cards: CardCatalogRow[] }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => (
        <li key={card.id}>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="font-semibold text-foreground">{card.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {card.description ?? "Carte disponible pour enrichissement futur."}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

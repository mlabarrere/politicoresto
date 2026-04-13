import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { SpaceRow } from "@/lib/types/views";

export function SpaceSummaryList({ spaces }: { spaces: SpaceRow[] }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {spaces.map((space) => (
        <li key={space.id}>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <Link
                href={`/space/${space.slug}`}
                className="text-base font-semibold text-foreground transition hover:text-primary"
              >
                {space.name}
              </Link>
              <p className="mt-2 text-sm text-muted-foreground">
                {space.description ?? "Espace editorial pret a etre enrichi."}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

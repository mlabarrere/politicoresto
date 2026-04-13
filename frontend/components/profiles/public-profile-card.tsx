import { Card, CardContent } from "@/components/ui/card";
import type { PublicProfileView } from "@/lib/types/views";

export function PublicProfileCard({ profile }: { profile: PublicProfileView }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4">
        <p className="text-lg font-semibold text-foreground">
          {profile.display_name ?? "Profil public"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.bio ?? "Aucune biographie publique disponible."}
        </p>
      </CardContent>
    </Card>
  );
}

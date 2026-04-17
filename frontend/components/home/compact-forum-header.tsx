import { AppCard } from "@/components/app/app-card";

export function CompactForumHeader() {
  return (
    <AppCard className="px-4 py-3">
      <p className="text-sm font-medium text-foreground">PoliticoResto</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Forum public minimal: parcourir, filtrer, ouvrir les posts.
      </p>
    </AppCard>
  );
}






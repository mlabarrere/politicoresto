import { AppCard } from "@/components/app/app-card";

export function CompactForumHeader() {
  return (
    <AppCard className="px-4 py-3">
      <p className="text-sm font-medium text-foreground">Forum politique</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Parcourir les sujets. Filtrer. Ouvrir les posts.
      </p>
    </AppCard>
  );
}






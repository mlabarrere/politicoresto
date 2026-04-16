import { Lock } from "lucide-react";

import { AppBanner } from "@/components/app/app-banner";
import { cn } from "@/lib/utils";

export function AppPrivateNotice({
  message = "Visible uniquement par vous",
  className
}: {
  message?: string;
  className?: string;
}) {
  return (
    <AppBanner
      title="Espace prive"
      body={message}
      className={cn("border-border/70 bg-background", className)}
    >
      <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" />
        Donnees privees
      </span>
    </AppBanner>
  );
}

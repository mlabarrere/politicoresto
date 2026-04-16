"use client";

import type { ReactNode } from "react";

import { AppButton } from "@/components/app/app-button";
import { AppDrawer } from "@/components/app/app-drawer";

export function AuthRequiredSheet({
  triggerContent,
  triggerLabel,
  triggerClassName,
  nextPath
}: {
  triggerContent: ReactNode;
  triggerLabel: string;
  triggerClassName: string;
  nextPath: string;
}) {
  const encodedNext = encodeURIComponent(nextPath || "/");

  return (
    <AppDrawer
      side="bottom"
      title="Participation reservee aux membres"
      trigger={
        <AppButton type="button" variant="ghost" aria-label={triggerLabel} className={triggerClassName}>
          {triggerContent}
        </AppButton>
      }
    >
      <p className="text-sm text-muted-foreground">Connectez-vous pour reagir, commenter et repondre dans le post.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <AppButton href={`/auth/login?next=${encodedNext}`}>Se connecter</AppButton>
        <AppButton href={`/auth/login?mode=signup&next=${encodedNext}`} variant="secondary">
          Creer un compte
        </AppButton>
      </div>
    </AppDrawer>
  );
}

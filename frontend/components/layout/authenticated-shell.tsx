import type { PropsWithChildren } from "react";

import { AppCard } from "@/components/app/app-card";
import { PageContainer } from "@/components/layout/page-container";
import { AuthNav } from "@/components/navigation/auth-nav";

export function AuthenticatedShell({ children }: PropsWithChildren) {
  return (
    <PageContainer>
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <AppCard className="border-border/60 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mon profil</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Mon profil</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Votre espace personnel reste prive. Les sondages avances pourront arriver plus tard.
            </p>
            <div className="mt-6">
              <AuthNav />
            </div>
          </AppCard>
        </aside>
        <section className="min-w-0 space-y-8">{children}</section>
      </div>
    </PageContainer>
  );
}

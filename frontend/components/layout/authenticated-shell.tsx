import type { PropsWithChildren } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { AuthNav } from "@/components/navigation/auth-nav";

export function AuthenticatedShell({ children }: PropsWithChildren) {
  return (
    <PageContainer>
      <div className="space-y-8">
        <section className="soft-panel p-6">
          <p className="eyebrow">Espace personnel</p>
          <h1 className="editorial-title mt-3 text-4xl font-bold text-foreground">Mon espace</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Une vue de retour sur vos predictions, vos cartes et la reputation accumulee dans
            les sujets publics que vous suivez.
          </p>
          <div className="mt-6">
            <AuthNav />
          </div>
        </section>
        {children}
      </div>
    </PageContainer>
  );
}

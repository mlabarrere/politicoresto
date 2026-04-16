import type { ReactNode } from "react";

import { AppCard } from "@/components/app/app-card";
import { AppPrivateNotice } from "@/components/app/app-private-notice";
import { AppSectionNav } from "@/components/app/app-section-nav";
import type { AccountSectionKey } from "@/lib/account/sections";

export function AppAccountShell({
  section,
  navItems,
  heading,
  subheading,
  children
}: {
  section: AccountSectionKey;
  navItems: Array<{ key: AccountSectionKey; label: string; description: string }>;
  heading: string;
  subheading: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 lg:px-10 lg:py-6">
      <AppCard className="vichy-accent space-y-3 border-border/70">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Espace personnel</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">{heading}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>
        </div>
        <AppPrivateNotice message="Visible uniquement par vous" />
      </AppCard>

      <div className="lg:hidden">
        <AppSectionNav items={navItems} mode="mobile" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:block lg:sticky lg:top-24">
          <AppSectionNav items={navItems} mode="desktop" />
        </aside>
        <section className="min-w-0" data-account-section={section}>
          {children}
        </section>
      </div>
    </div>
  );
}

import type { PropsWithChildren } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppPrimaryCTA } from "@/components/app/app-primary-cta";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";

export async function AppShell({ children }: PropsWithChildren) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const isAuthenticated = Boolean(session);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader isAuthenticated={isAuthenticated} />
      <main className="pb-12">{children}</main>
      <div className="fixed bottom-4 right-4 z-40 lg:hidden">
        <AppPrimaryCTA mode="fab" isAuthenticated={isAuthenticated} />
      </div>
      <SiteFooter />
    </div>
  );
}

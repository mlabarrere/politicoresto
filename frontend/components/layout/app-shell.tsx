import type { PropsWithChildren } from "react";

import { createPostAction } from "@/lib/actions/posts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CreateFlowProvider } from "@/components/layout/create-flow-provider";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";

export async function AppShell({ children }: PropsWithChildren) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const isAuthenticated = Boolean(session);

  return (
    <CreateFlowProvider isAuthenticated={isAuthenticated} action={createPostAction}>
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader isAuthenticated={isAuthenticated} />
        <main className="pb-12">{children}</main>
        <SiteFooter />
      </div>
    </CreateFlowProvider>
  );
}

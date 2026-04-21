import type { PropsWithChildren } from 'react';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { AppPrimaryCTA } from '@/components/app/app-primary-cta';
import { AppHeader } from '@/components/layout/app-header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { SiteFooter } from '@/components/layout/site-footer';

export async function AppShell({ children }: PropsWithChildren) {
  // Appel direct à cookies() pour signaler à Next.js 16 que ce sous-arbre
  // dépend du cookie de session — sans ça, le RSC peut être cacheé en version
  // anonyme et l'utilisateur connecté voit un header "Se connecter" après OAuth.
  await cookies();
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  const isAuthenticated = Boolean(userId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader isAuthenticated={isAuthenticated} />
      <main className="pb-20">{children}</main>
      <div className="fixed bottom-20 right-4 z-40 lg:hidden">
        <AppPrimaryCTA mode="fab" isAuthenticated={isAuthenticated} />
      </div>
      <MobileBottomNav />
      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import type { Route } from "next";
import { Menu } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { MainNav } from "@/components/navigation/main-nav";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/lib/config/site";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger
                render={<Button variant="outline" size="icon-sm" aria-label="Ouvrir la navigation" />}
              >
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] bg-card">
                <SheetTitle className="text-xl font-semibold tracking-tight">Politicoresto</SheetTitle>
                <div className="mt-6 flex flex-col gap-3">
                  {siteConfig.navigation.primary.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div>
            <Link href="/" className="text-xl font-semibold tracking-tight text-foreground">
              {siteConfig.name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">Feed presidentiel</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MainNav />
          {session ? (
            <div className="flex items-center gap-3">
              <Link
                href="/me"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Mon profil
              </Link>
              <SignOutButton />
            </div>
          ) : (
            <Link href="/auth/login" className={cn(buttonVariants({ size: "sm" }))}>
              Participer
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

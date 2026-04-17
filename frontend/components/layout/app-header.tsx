import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { Menu } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppButton } from "@/components/app/app-button";
import { AppPrimaryCTA } from "@/components/app/app-primary-cta";
import { AppDrawer } from "@/components/app/app-drawer";
import { MainNav } from "@/components/navigation/main-nav";
import { siteConfig } from "@/lib/config/site";

export function AppHeader({
  isAuthenticated
}: {
  isAuthenticated: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="lg:hidden">
            <AppDrawer
              side="left"
              title="PoliticoResto"
              trigger={<AppButton variant="secondary" size="sm" aria-label="Ouvrir la navigation" icon={<Menu />} />}
            >
              <div className="mt-3 flex flex-col gap-3">
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
            </AppDrawer>
          </div>

          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-politicoresto.svg"
              alt="Logo PoliticoResto"
              width={36}
              height={36}
              className="size-9 rounded-md border border-border bg-background p-1"
              priority
            />
            <div>
              <p className="text-xl font-semibold tracking-tight text-foreground">{siteConfig.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Forum public minimal</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <MainNav />
          <AppPrimaryCTA isAuthenticated={isAuthenticated} />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <AppButton variant="secondary" size="sm" href="/me">Mon profil</AppButton>
              <SignOutButton />
            </div>
          ) : (
            <AppButton size="sm" href="/auth/login">Participer</AppButton>
          )}
        </div>
      </div>
    </header>
  );
}

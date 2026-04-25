import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { AppButton } from '@/components/app/app-button';
import { AppPrimaryCTA } from '@/components/app/app-primary-cta';
import { AppDrawer } from '@/components/app/app-drawer';
import { MainNav } from '@/components/navigation/main-nav';
import { siteConfig } from '@/lib/config/site';

export function AppHeader({
  isAuthenticated,
  unreadNotifications = 0,
}: {
  isAuthenticated: boolean;
  unreadNotifications?: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="lg:hidden">
            <AppDrawer
              side="left"
              title="PoliticoResto"
              trigger={
                <AppButton
                  variant="secondary"
                  size="sm"
                  aria-label="Ouvrir la navigation"
                  icon={<Menu />}
                />
              }
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
              className="size-9"
              priority
            />
            <p className="text-xl font-semibold tracking-tight text-foreground">
              {siteConfig.name}
            </p>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <MainNav />
          <AppPrimaryCTA isAuthenticated={isAuthenticated} />
          {isAuthenticated ? (
            <>
              <Link
                href={'/me/notifications' as Route}
                aria-label={
                  unreadNotifications > 0
                    ? `${unreadNotifications} notification(s) non lue(s)`
                    : 'Notifications'
                }
                className="relative hidden h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition hover:bg-secondary lg:inline-flex"
              >
                Notifs
                {unreadNotifications > 0 ? (
                  <span
                    data-testid="notif-badge"
                    className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background"
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                ) : null}
              </Link>
              <AppButton variant="secondary" size="sm" href="/me">
                Mon profil
              </AppButton>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <AppButton variant="secondary" size="sm" href="/auth/login">
                Se connecter
              </AppButton>
              <AppButton size="sm" href="/auth/login">
                Créer un compte
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

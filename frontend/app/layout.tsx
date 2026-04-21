import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import type { PropsWithChildren } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { AppShell } from '@/components/layout/app-shell';
import { siteConfig } from '@/lib/config/site';
import { cn } from '@/lib/utils';
import '@/app/globals.css';

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

// Le layout lit le cookie de session via AppShell → getAuthUserId. On force
// le rendering dynamique pour que Next.js 16 ne serve jamais une version
// pré-rendue anonyme à un utilisateur authentifié (bug vu sur toutes les pages
// après OAuth : cookies présents mais AppShell affichait "Se connecter").
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="fr" className={cn('font-sans', sans.variable)}>
      <body className="page-shell">
        <AppShell>{children}</AppShell>
        <SpeedInsights />
      </body>
    </html>
  );
}

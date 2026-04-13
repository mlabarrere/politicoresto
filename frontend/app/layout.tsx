import type { Metadata } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import type { PropsWithChildren } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/utils";
import "@/app/globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description
};

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="fr" className={cn("font-sans", sans.variable, serif.variable)}>
      <body className="page-shell">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

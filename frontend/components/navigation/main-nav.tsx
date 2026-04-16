import Link from "next/link";
import type { Route } from "next";

import { siteConfig } from "@/lib/config/site";

export function MainNav() {
  return (
    <nav className="hidden lg:flex items-center gap-2" aria-label="Navigation principale">
      {siteConfig.navigation.primary.map((item) => (
        <Link
          key={item.href}
          href={item.href as Route}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

import Link from "next/link";

import { siteConfig } from "@/lib/config/site";

export function AuthNav() {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {siteConfig.navigation.authenticated.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg border border-border bg-background px-4 py-2 font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

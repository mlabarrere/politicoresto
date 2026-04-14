"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";

export function AuthNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2 text-sm">
      {siteConfig.navigation.authenticated.map((item) => {
        const baseHref = item.href.split("#")[0];
        const active = pathname === baseHref || pathname.startsWith(`${baseHref}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-2xl border px-4 py-3 font-medium transition",
              active
                ? "border-foreground bg-foreground text-background shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:bg-secondary hover:text-foreground"
            )}
          >
            <span>{item.label}</span>
            {item.hint ? <span className="text-xs opacity-70">{item.hint}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

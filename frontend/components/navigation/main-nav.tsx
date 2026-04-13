import Link from "next/link";
import type { Route } from "next";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList
} from "@/components/ui/navigation-menu";
import { siteConfig } from "@/lib/config/site";

export function MainNav() {
  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList className="gap-2">
        {siteConfig.navigation.primary.map((item) => (
          <NavigationMenuItem key={item.href}>
            <Link
              href={item.href as Route}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

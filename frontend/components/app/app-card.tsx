import type { ElementType, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function AppCard<T extends ElementType = "section">({
  as,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: T }) {
  const Comp = as ?? "section";
  return <Comp {...props} className={cn("rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-sm)]", className)} />;
}

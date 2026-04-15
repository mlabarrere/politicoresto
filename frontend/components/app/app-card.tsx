import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function AppCard({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("app-card", className)} {...props} />;
}

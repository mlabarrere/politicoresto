import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel
}: {
  title: string;
  body: string;
  actionHref?: Route;
  actionLabel?: string;
}) {
  return (
    <Alert className="rounded-xl border border-border bg-muted/60">
      <AlertTitle className="font-semibold text-foreground">{title}</AlertTitle>
      <AlertDescription className="mt-2 text-sm leading-6 text-muted-foreground">
        {body}
      </AlertDescription>
      {actionHref && actionLabel ? (
        <div className="mt-4">
          <Link
            href={actionHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {actionLabel}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
      ) : null}
    </Alert>
  );
}

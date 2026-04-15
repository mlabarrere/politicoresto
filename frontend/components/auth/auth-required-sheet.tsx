"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

export function AuthRequiredSheet({
  triggerContent,
  triggerLabel,
  triggerClassName,
  nextPath
}: {
  triggerContent: ReactNode;
  triggerLabel: string;
  triggerClassName: string;
  nextPath: string;
}) {
  const encodedNext = encodeURIComponent(nextPath || "/");

  return (
    <Sheet>
      <SheetTrigger
        render={<button type="button" aria-label={triggerLabel} className={triggerClassName} />}
      >
        {triggerContent}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl border-x border-t border-border bg-card">
        <SheetHeader>
          <SheetTitle>Participation reservee aux membres</SheetTitle>
          <SheetDescription>
            Connectez-vous pour reagir, commenter et repondre dans le thread.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2 px-4 pb-4">
          <Link
            href={`/auth/login?next=${encodedNext}`}
            className="block rounded-xl bg-foreground px-3 py-2 text-center text-sm font-medium text-background"
          >
            Se connecter
          </Link>
          <Link
            href={`/auth/login?mode=signup&next=${encodedNext}`}
            className="block rounded-xl border border-border px-3 py-2 text-center text-sm font-medium text-foreground"
          >
            Creer un compte
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

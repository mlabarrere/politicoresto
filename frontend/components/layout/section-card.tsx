import type { PropsWithChildren, ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  eyebrow,
  children,
  aside,
  className,
  contentClassName
}: PropsWithChildren<{
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  className?: string;
  contentClassName?: string;
}>) {
  return (
    <Card className={cn("overflow-hidden border-border bg-card", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <CardTitle className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {title}
            </CardTitle>
          </div>
          {aside}
        </div>
      </CardHeader>
      <CardContent className={cn("px-5 pb-5 pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

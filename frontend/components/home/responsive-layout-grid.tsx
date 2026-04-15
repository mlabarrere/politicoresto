import type { PropsWithChildren, ReactNode } from "react";

export function ResponsiveLayoutGrid({
  left,
  right,
  children
}: PropsWithChildren<{ left: ReactNode; right: ReactNode }>) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[260px_minmax(0,1fr)_280px]">
      {left}
      <main className="min-w-0 space-y-4">{children}</main>
      {right}
    </div>
  );
}


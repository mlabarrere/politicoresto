import clsx from "clsx";
import type { SelectHTMLAttributes } from "react";

export function CatalystSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] outline-none transition",
        "focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
        className
      )}
    />
  );
}

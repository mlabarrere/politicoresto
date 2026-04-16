import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function CatalystBadge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        className
      )}
    />
  );
}

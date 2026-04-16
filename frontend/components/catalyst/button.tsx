import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const toneClass = {
  solid: "text-white [--btn-bg:hsl(var(--primary))] [--btn-border:hsl(var(--primary))]",
  soft: "text-foreground [--btn-bg:hsl(var(--secondary))] [--btn-border:hsl(var(--border))]",
  plain: "text-foreground [--btn-bg:transparent] [--btn-border:transparent]"
} as const;

const sizeClass = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm"
} as const;

export function CatalystButton({
  tone = "solid",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof toneClass;
  size?: keyof typeof sizeClass;
  icon?: ReactNode;
}) {
  return (
    <button
      {...props}
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50",
        "border-(--btn-border) bg-(--btn-bg) hover:brightness-95",
        toneClass[tone],
        sizeClass[size],
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

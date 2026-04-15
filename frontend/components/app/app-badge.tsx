import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneClassName = {
  default: "border-border bg-background text-foreground",
  accent: "border-amber-200 bg-amber-50 text-amber-800",
  muted: "border-stone-200 bg-stone-100 text-stone-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800"
} as const;

export function AppBadge({
  label,
  tone = "default"
}: {
  label: string;
  tone?: keyof typeof toneClassName;
}) {
  return (
    <Badge className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", toneClassName[tone])}>
      {label}
    </Badge>
  );
}

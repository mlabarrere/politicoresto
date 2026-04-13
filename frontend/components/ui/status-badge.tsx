import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  tone = "default"
}: {
  label: string;
  tone?: "default" | "accent" | "muted" | "info" | "success" | "warning" | "danger";
}) {
  return (
    <Badge
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "default" && "border-border bg-background text-foreground",
        tone === "accent" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "muted" && "border-stone-200 bg-stone-100 text-stone-700",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-800",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-800"
      )}
    >
      {label}
    </Badge>
  );
}

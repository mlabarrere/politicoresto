import { cn } from "@/lib/utils";

export function ScoreBadge({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "accent";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        tone === "neutral"
          ? "border-border bg-background text-muted-foreground"
          : "border-sky-200 bg-sky-50 text-sky-700"
      )}
    >
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

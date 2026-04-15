import { AppBadge } from "@/components/app/app-badge";

export function PollStatusBadge({ status }: { status: "open" | "closed" }) {
  return (
    <AppBadge
      label={status === "open" ? "Actif" : "Clos"}
      tone={status === "open" ? "info" : "muted"}
    />
  );
}

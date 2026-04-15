import { Select } from "@/components/ui/select";
import type { ComponentProps } from "react";

export function AppSelect(props: ComponentProps<typeof Select>) {
  return <Select className="rounded-xl px-3 py-2" {...props} />;
}

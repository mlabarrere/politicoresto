import { Textarea } from "@/components/ui/textarea";
import type { ComponentProps } from "react";

export function AppTextarea(props: ComponentProps<typeof Textarea>) {
  return <Textarea className="rounded-xl px-3 py-2" {...props} />;
}

import { Input } from "@/components/ui/input";
import type { ComponentProps } from "react";

export function AppInput(props: ComponentProps<typeof Input>) {
  return <Input className="rounded-xl px-3 py-2" {...props} />;
}

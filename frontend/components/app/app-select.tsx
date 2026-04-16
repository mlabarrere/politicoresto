import type { SelectHTMLAttributes } from "react";

import { CatalystSelect } from "@/components/catalyst/select";

export function AppSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <CatalystSelect {...props} />;
}

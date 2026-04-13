import type { PropsWithChildren } from "react";

import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { requireSession } from "@/lib/guards/require-session";

export default async function AuthenticatedLayout({
  children
}: PropsWithChildren) {
  await requireSession();

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}

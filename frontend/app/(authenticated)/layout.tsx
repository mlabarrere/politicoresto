import type { PropsWithChildren } from 'react';

import { requireSession } from '@/lib/guards/require-session';

export default async function AuthenticatedLayout({
  children,
}: PropsWithChildren) {
  await requireSession();

  return children;
}

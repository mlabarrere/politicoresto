import { notFound } from 'next/navigation';

// Frozen for the forum-only release (Tranche 1): notifications are produced
// solely by the prono backend (frozen in Tranche 3). The original
// implementation is preserved in git history and restored with pronos.
export default function NotificationsPage() {
  notFound();
  return null;
}

import { notFound } from 'next/navigation';

// Frozen for the forum-only release (Tranche 1): pronos ship in Tranche 3.
// The original moderation queue is preserved in git history.
export default function AdminPronosPage() {
  notFound();
  return null;
}

import { notFound } from 'next/navigation';

// Frozen for the forum-only release (Tranche 1): the poll weighting methodology
// ships with the polls in Tranche 2. The original content is preserved in git
// history and restored when polls are unfrozen.
export default function MethodologiePage() {
  notFound();
  return null;
}

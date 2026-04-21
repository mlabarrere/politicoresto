'use client';

import { AppCard } from '@/components/app/app-card';
import { AppFilterBar } from '@/components/app/app-filter-bar';
import type { PostToolbarProps } from '@/lib/types/forum-components';

const SORT_OPTIONS: {
  value: 'top' | 'recent' | 'oldest';
  label: string;
}[] = [
  { value: 'top', label: 'Populaires' },
  { value: 'recent', label: 'Récentes' },
  { value: 'oldest', label: 'Anciennes' },
];

export function PostToolbar({ sortMode, onSortChange }: PostToolbarProps) {
  return (
    <AppCard className="px-3 py-2" aria-label="Trier les commentaires">
      <AppFilterBar
        options={SORT_OPTIONS}
        value={sortMode}
        onChange={onSortChange}
      />
    </AppCard>
  );
}

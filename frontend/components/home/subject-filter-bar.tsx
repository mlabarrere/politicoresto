'use client';

import { cn } from '@/lib/utils';
import type { CategoryFilter } from '@/lib/types/homepage';
import type { SubjectView } from '@/lib/types/screens';

interface SubjectFilterBarProps {
  subjects: SubjectView[];
  activeFilter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
}

export function SubjectFilterBar({
  subjects,
  activeFilter,
  onFilterChange,
}: SubjectFilterBarProps) {
  if (!subjects.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {subjects.map((subject) => {
        const isActive =
          activeFilter?.type === 'subject' &&
          activeFilter.slug === subject.slug;
        return (
          <button
            key={subject.slug}
            type="button"
            onClick={() =>
              { onFilterChange(
                isActive ? null : { type: 'subject', slug: subject.slug },
              ); }
            }
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground hover:bg-muted/70',
            )}
          >
            {subject.emoji ? <span>{subject.emoji}</span> : null}
            <span>{subject.name}</span>
          </button>
        );
      })}
    </div>
  );
}

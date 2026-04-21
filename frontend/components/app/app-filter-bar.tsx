'use client';

import { AppButton } from '@/components/app/app-button';

export type AppFilterOption<T extends string> = {
  value: T;
  label: string;
};

export function AppFilterBar<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: AppFilterOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      {options.map((option) => (
        <AppButton
          key={option.value}
          type="button"
          variant={value === option.value ? 'primary' : 'secondary'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </AppButton>
      ))}
    </div>
  );
}

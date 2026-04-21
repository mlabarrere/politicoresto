import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string | { pathname?: string };
  }) => {
    const resolvedHref =
      typeof href === 'string' ? href : (href.pathname ?? '#');

    return React.createElement('a', { href: resolvedHref, ...props }, children);
  },
}));

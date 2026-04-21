import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Route } from 'next';

import { EmptyState } from '@/components/layout/empty-state';
import { ScreenState } from '@/components/layout/screen-state';
import { StatusBadge } from '@/components/ui/status-badge';

describe('Editorial UI states', () => {
  it('renders an empty state with a clear recovery action', () => {
    render(
      <EmptyState
        title="Aucun Post visible pour le moment"
        body="Revenez plus tard ou explorez un autre bloc."
        actionHref={'/' as Route}
        actionLabel="Voir le feed"
      />,
    );

    expect(
      screen.getByText('Aucun Post visible pour le moment'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Revenez plus tard ou explorez un autre bloc.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le feed' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('renders a screen state with navigation and retry affordances', () => {
    const onRetry = vi.fn();

    render(
      <ScreenState
        title="Le feed demande une nouvelle verification"
        body="Les donnees reviennent, mais pas encore de facon stable."
        actionHref={'/' as Route}
        actionLabel="Voir le feed"
        retryLabel="Recharger"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Infos utiles')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le feed' })).toHaveAttribute(
      'href',
      '/',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Recharger' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('exposes a readable warning status badge', () => {
    render(<StatusBadge label="Resolution imminente" tone="warning" />);

    const badge = screen.getByText('Resolution imminente');

    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-amber-50');
    expect(badge.className).toContain('text-amber-800');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSectionNav } from '@/components/app/app-section-nav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/me',
  useSearchParams: () => new URLSearchParams('section=comments'),
}));

describe('appSectionNav', () => {
  it('renders section links and marks active section', () => {
    render(
      <AppSectionNav
        items={[
          { key: 'profile', label: 'Profil', description: 'identite' },
          { key: 'comments', label: 'Commentaires', description: 'prive' },
        ]}
      />,
    );

    const commentLinks = screen.getAllByRole('link', {
      name: /Commentaires/i,
    });
    const profileLinks = screen.getAllByRole('link', { name: /Profil/i });

    expect(commentLinks[0]).toHaveClass('border-[hsl(var(--primary))]');
    expect(profileLinks[0]).not.toHaveClass('border-[hsl(var(--primary))]');
  });
});

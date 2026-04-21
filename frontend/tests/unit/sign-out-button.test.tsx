import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/data/rpc/auth', () => ({
  signOutAction: vi.fn(),
}));

import { SignOutButton } from '@/components/auth/sign-out-button';

describe('SignOutButton', () => {
  it('renders a submit button', () => {
    render(<SignOutButton />);
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
    expect(button.getAttribute('type')).toBe('submit');
  });

  it('has the correct label text', () => {
    render(<SignOutButton />);
    expect(screen.getByText('Se deconnecter')).toBeTruthy();
  });

  it('is wrapped in a form with the signOutAction', () => {
    const { container } = render(<SignOutButton />);
    const form = container.querySelector('form');
    expect(form).toBeTruthy();
  });
});

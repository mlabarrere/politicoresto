import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppPrimaryCTA } from '@/components/app/app-primary-cta';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/',
}));

describe('AppPrimaryCTA', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('redirects authenticated users to /post/new', () => {
    render(<AppPrimaryCTA isAuthenticated />);
    fireEvent.click(screen.getByRole('button', { name: /Cr.+er/i }));

    expect(pushMock).toHaveBeenCalledWith('/post/new');
  });

  it('redirects to login with next path when unauthenticated', () => {
    render(<AppPrimaryCTA isAuthenticated={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Cr.+er/i }));

    expect(pushMock).toHaveBeenCalledWith('/auth/login?next=%2F');
  });
});

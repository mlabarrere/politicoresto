import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuthCodeErrorPage from '@/app/auth/auth-code-error/page';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string | { pathname: string; query?: Record<string, string> };
  }) => {
    const resolved =
      typeof href === 'string'
        ? href
        : href.query
          ? `${href.pathname}?${new URLSearchParams(href.query).toString()}`
          : href.pathname;
    return <a href={resolved}>{children}</a>;
  },
}));

describe('authCodeErrorPage', () => {
  it('renders oauth_missing_code message', async () => {
    render(
      await AuthCodeErrorPage({
        searchParams: Promise.resolve({ reason: 'oauth_missing_code' }),
      }),
    );
    expect(
      screen.getByRole('heading', { name: /Erreur d.authentification/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pas renvoyé de code/i)).toBeInTheDocument();
  });

  it('renders oauth_exchange_failed message', async () => {
    render(
      await AuthCodeErrorPage({
        searchParams: Promise.resolve({ reason: 'oauth_exchange_failed' }),
      }),
    );
    expect(screen.getByText(/session n.a pas pu/i)).toBeInTheDocument();
  });

  it('renders a generic message for unknown reasons', async () => {
    render(
      await AuthCodeErrorPage({
        searchParams: Promise.resolve({ reason: 'something_else' }),
      }),
    );
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
  });

  it('retry link includes next param when provided', async () => {
    render(
      await AuthCodeErrorPage({
        searchParams: Promise.resolve({
          reason: 'oauth_missing_code',
          next: '/post/abc',
        }),
      }),
    );
    const retryLink = screen.getByRole('link', { name: /Retourner/i });
    expect(retryLink).toHaveAttribute('href', '/auth/login?next=%2Fpost%2Fabc');
  });

  it('retry link drops next when it is the default root', async () => {
    render(
      await AuthCodeErrorPage({
        searchParams: Promise.resolve({ reason: 'oauth_missing_code' }),
      }),
    );
    const retryLink = screen.getByRole('link', { name: /Retourner/i });
    expect(retryLink).toHaveAttribute('href', '/auth/login');
  });
});

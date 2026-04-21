import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthButtons } from '@/components/auth/oauth-buttons';

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  createBrowserSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: mocks.createBrowserSupabaseClient,
}));

// Simulate dynamic import resolution
vi.mock('@/lib/supabase/client', async () => ({
  createBrowserSupabaseClient: mocks.createBrowserSupabaseClient,
}));

describe('OAuthButtons', () => {
  beforeEach(() => {
    mocks.signInWithOAuth.mockReset();
    mocks.createBrowserSupabaseClient.mockReset();
    mocks.createBrowserSupabaseClient.mockReturnValue({
      auth: { signInWithOAuth: mocks.signInWithOAuth },
    });
    vi.stubEnv('NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH', 'true');
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000', assign: vi.fn() },
      writable: true,
    });
  });

  it('renders Google OAuth button', () => {
    render(<OAuthButtons />);
    expect(screen.getByText('Continuer avec Google')).toBeTruthy();
  });

  it('shows no error on initial render', () => {
    render(<OAuthButtons />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables button when Google OAuth is disabled via env', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH', 'false');
    render(<OAuthButtons />);
    const button = screen.getByText('Continuer avec Google').closest('button');
    expect(button?.disabled).toBe(true);
  });

  it('shows disabled notice when Google OAuth is turned off', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH', 'false');
    render(<OAuthButtons />);
    expect(screen.getByText(/NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH/)).toBeTruthy();
  });

  it('redirects to OAuth URL on successful sign-in', async () => {
    const assignMock = vi.fn();
    window.location.assign = assignMock;
    mocks.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth2?client_id=x' },
      error: null,
    });

    render(<OAuthButtons next="/me" />);
    const button = screen.getByText('Continuer avec Google');
    fireEvent.click(button);

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(
        'https://accounts.google.com/oauth2?client_id=x',
      );
    });
  });

  it('shows error message on OAuth failure', async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: {},
      error: { message: 'some error' },
    });

    render(<OAuthButtons />);
    fireEvent.click(screen.getByText('Continuer avec Google'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  it('shows provider-not-enabled message when provider disabled in Supabase', async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: {},
      error: { message: 'provider is not enabled' },
    });

    render(<OAuthButtons />);
    fireEvent.click(screen.getByText('Continuer avec Google'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Activez');
    });
  });

  it('shows fallback error when OAuth returns no URL', async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: {},
      error: null,
    });

    render(<OAuthButtons />);
    fireEvent.click(screen.getByText('Continuer avec Google'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Impossible');
    });
  });
});

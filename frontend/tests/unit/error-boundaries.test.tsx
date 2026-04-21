import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ErrorBoundary from '@/app/error';
import GlobalErrorBoundary from '@/app/global-error';

describe('app/error.tsx', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders the digest when present and logs the error', () => {
    const reset = vi.fn();
    const error = Object.assign(new Error('kaboom'), { digest: 'digest-abc' });

    render(<ErrorBoundary error={error} reset={reset} />);

    expect(screen.getByText(/Une erreur est survenue/)).toBeInTheDocument();
    expect(screen.getByText(/digest-abc/)).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[error-boundary] rendered fallback',
      expect.objectContaining({
        message: 'kaboom',
        digest: 'digest-abc',
      }),
    );
  });

  it('falls back to generic message when digest is absent', () => {
    const reset = vi.fn();
    const error = new Error('silent fail') as Error & { digest?: string };

    render(<ErrorBoundary error={error} reset={reset} />);

    expect(screen.getByText(/Merci de réessayer/)).toBeInTheDocument();
    expect(screen.queryByText(/Référence/)).not.toBeInTheDocument();
  });

  it('invokes reset when the retry button is clicked', async () => {
    const reset = vi.fn();
    const error = new Error('retry me') as Error & { digest?: string };

    render(<ErrorBoundary error={error} reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: /Réessayer/ }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe('app/global-error.tsx', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders the critical error UI and logs via console.error', () => {
    const reset = vi.fn();
    const error = Object.assign(new Error('critical'), { digest: 'd-1' });

    render(<GlobalErrorBoundary error={error} reset={reset} />);

    expect(screen.getByText(/Erreur critique/)).toBeInTheDocument();
    expect(screen.getByText(/d-1/)).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[global-error-boundary] rendered fallback',
      expect.objectContaining({ message: 'critical', digest: 'd-1' }),
    );
  });

  it('shows the fallback message when digest is missing', () => {
    const reset = vi.fn();
    const error = new Error('') as Error & { digest?: string };

    render(<GlobalErrorBoundary error={error} reset={reset} />);

    expect(
      screen.getByText(/L'application a rencontré un problème/),
    ).toBeInTheDocument();
  });

  it('invokes reset when the reload button is clicked', async () => {
    const reset = vi.fn();
    const error = new Error('reload me') as Error & { digest?: string };

    render(<GlobalErrorBoundary error={error} reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: /Recharger/ }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

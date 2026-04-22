import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '@/app/error';
import GlobalErrorBoundary from '@/app/global-error';

// Client-side logger posts to /api/log — stub fetch so assertions don't
// depend on network and assert on the forwarded payload shape.
function stubFetch(): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response(null, { status: 200 }));
}

function lastLogPayload(
  fetchSpy: ReturnType<typeof vi.spyOn>,
): Record<string, unknown> | null {
  const calls = fetchSpy.mock.calls as unknown as [
    string,
    { body?: string } | undefined,
  ][];
  if (calls.length === 0) return null;
  const last = calls.at(-1);
  if (!last) return null;
  const [, init] = last;
  if (!init?.body) return null;
  return JSON.parse(init.body) as Record<string, unknown>;
}

describe('app/error.tsx', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = stubFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('renders the digest when present and logs the error', () => {
    const reset = vi.fn();
    const error = Object.assign(new Error('kaboom'), { digest: 'digest-abc' });

    render(<ErrorBoundary error={error} reset={reset} />);

    expect(screen.getByText(/Une erreur est survenue/)).toBeInTheDocument();
    expect(screen.getByText(/digest-abc/)).toBeInTheDocument();
    const payload = lastLogPayload(fetchSpy);
    expect(payload?.context).toBe('error-boundary');
    expect(payload?.level).toBe('error');
    expect(payload?.event).toBe('error_boundary.rendered');
    expect(payload?.fields).toMatchObject({
      message: 'kaboom',
      digest: 'digest-abc',
    });
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
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = stubFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('renders the critical error UI and forwards an error log', () => {
    const reset = vi.fn();
    const error = Object.assign(new Error('critical'), { digest: 'd-1' });

    render(<GlobalErrorBoundary error={error} reset={reset} />);

    expect(screen.getByText(/Erreur critique/)).toBeInTheDocument();
    expect(screen.getByText(/d-1/)).toBeInTheDocument();
    const payload = lastLogPayload(fetchSpy);
    expect(payload?.context).toBe('global-error-boundary');
    expect(payload?.event).toBe('global_error_boundary.rendered');
    expect(payload?.fields).toMatchObject({
      message: 'critical',
      digest: 'd-1',
    });
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

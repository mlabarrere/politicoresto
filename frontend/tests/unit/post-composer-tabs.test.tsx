import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PostComposer } from '@/components/home/post-composer';

vi.mock('@/lib/data/political-taxonomy', () => ({
  politicalBlocs: [],
}));

// Ensure localStorage is available in jsdom environment
beforeAll(() => {
  if (
    typeof window.localStorage === 'undefined' ||
    typeof window.localStorage.getItem !== 'function'
  ) {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        store[key] = undefined as unknown as string;
      },
      clear: () => {
        Object.keys(store).forEach((k) => {
          store[k] = undefined as unknown as string;
        });
      },
    });
  }
});

describe('post composer tabs', () => {
  it('renders 3 tabs and poll info block', () => {
    // clientLog() forwards via fetch('/api/log') — stub to assert payload.
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(null, { status: 200 }));

    render(
      <PostComposer
        action={async () => undefined}
        redirectPath="/"
        initialError="Publication impossible pour le moment. Reessayez."
      />,
    );

    expect(screen.getByRole('tab', { name: 'Post' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Sondage' })).toBeTruthy();
    expect(screen.getByText('Publication impossible')).toBeTruthy();
    expect(
      screen.getByText('Publication impossible pour le moment. Reessayez.'),
    ).toBeTruthy();
    expect(screen.getByText('Mode sondage')).toBeTruthy();
    expect(
      screen.getByText(/version brute et version redressee automatiquement/),
    ).toBeTruthy();
    expect(screen.getByText('Corps (Markdown)')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Enregistrer le brouillon' }),
    ).toBeTruthy();

    // The initial-error log event was forwarded to /api/log.
    const calls = fetchSpy.mock.calls as unknown as [
      string,
      { body?: string } | undefined,
    ][];
    const last = calls.at(-1);
    const payload = last?.[1]?.body
      ? (JSON.parse(last[1].body) as Record<string, unknown>)
      : null;
    expect(payload?.context).toBe('post-composer');
    expect(payload?.event).toBe('post_composer.initial_error');
    expect(payload?.fields).toMatchObject({
      message: 'Publication impossible pour le moment. Reessayez.',
    });

    fetchSpy.mockRestore();
  });
});

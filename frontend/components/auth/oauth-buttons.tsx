'use client';

/* eslint-disable no-console -- client boundary, server logger unavailable here.
 * These call sites will be forwarded to /api/_log in Session 3.
 * Event taxonomy (for the forthcoming forwarder):
 *   auth.oauth.google.start
 *   auth.oauth.google.signin_failed
 *   auth.oauth.google.redirect_to_provider
 *   auth.oauth.google.no_url
 */

import { useState } from 'react';

import { AppButton } from '@/components/app/app-button';

function normalizeNextPath(next?: string) {
  const fallback = '/';
  if (!next) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//')) return fallback;
  if (next.includes('://')) return fallback;

  try {
    const url = new URL(next, 'http://localhost');
    if (url.origin !== 'http://localhost') return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function OAuthButtons({ next = '/me' }: { next?: string }) {
  const [pending, setPending] = useState<'google' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH !== 'false';

  async function handleProvider() {
    if (!googleEnabled) {
      setErrorMessage(
        'Connexion Google indisponible. Google OAuth doit etre active cote Supabase.',
      );
      return;
    }

    const { createBrowserSupabaseClient } =
      await import('@/lib/supabase/client');
    const supabase = createBrowserSupabaseClient();
    setErrorMessage(null);
    setPending('google');
    const safeNext = normalizeNextPath(next);
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

    console.info('[oauth/google] start', {
      origin,
      redirectTo,
      next: safeNext,
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      setPending(null);
      console.error('[oauth/google] signInWithOAuth failed', {
        message: error.message,
        status: error.status,
        name: error.name,
        origin,
      });
      const normalized = `${error.message}`.toLowerCase();
      if (
        normalized.includes('provider is not enabled') ||
        normalized.includes('unsupported provider')
      ) {
        setErrorMessage(
          'Connexion Google indisponible. Activez le provider Google dans Supabase Auth.',
        );
        return;
      }
      setErrorMessage(
        `Connexion Google impossible (${error.status ?? '?'} — ${error.name ?? '?'}). Voir la console pour le detail.`,
      );
      return;
    }

    if (data.url) {
      console.info('[oauth/google] redirecting to provider');
      window.location.assign(data.url);
      return;
    }

    setPending(null);
    console.error('[oauth/google] signInWithOAuth returned no URL', { origin });
    setErrorMessage(
      "Impossible d'ouvrir la connexion Google (pas d'URL renvoyee par Supabase).",
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AppButton
        onClick={() => handleProvider()}
        disabled={pending !== null || !googleEnabled}
      >
        {pending === 'google' ? 'Connexion...' : 'Continuer avec Google'}
      </AppButton>
      {errorMessage ? (
        <p className="text-xs leading-6 text-amber-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {!googleEnabled ? (
        <p className="text-xs leading-6 text-muted-foreground">
          Activez `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=true` une fois Google
          configure dans Supabase.
        </p>
      ) : null}
    </div>
  );
}

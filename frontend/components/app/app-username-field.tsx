'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppInput } from '@/components/app/app-input';
import { normalizeUsername, validateUsername } from '@/lib/account/username';

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export function AppUsernameField({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [state, setState] = useState<AvailabilityState>('idle');
  const [message, setMessage] = useState<string>(
    '3 a 24 caracteres, minuscules, chiffres et underscore.',
  );

  const normalized = useMemo(() => normalizeUsername(value), [value]);

  useEffect(() => {
    const validationError = validateUsername(normalized);
    if (!normalized) {
      setState('idle');
      setMessage('3 a 24 caracteres, minuscules, chiffres et underscore.');
      return;
    }
    if (validationError) {
      setState('error');
      setMessage(validationError);
      return;
    }

    let cancelled = false;
    setState('checking');
    setMessage('Verification de disponibilite...');

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/account/username-availability?value=${encodeURIComponent(normalized)}`,
          {
            method: 'GET',
            cache: 'no-store',
          },
        );
        const payload = (await response.json()) as {
          available?: boolean;
          isCurrentUsername?: boolean;
          reason?: string | null;
        };

        if (cancelled) return;

        if (!response.ok) {
          setState('error');
          setMessage(payload.reason ?? 'Verification indisponible.');
          return;
        }

        if (payload.available || payload.isCurrentUsername) {
          setState('available');
          setMessage(
            payload.isCurrentUsername
              ? 'Votre username actuel.'
              : 'Username disponible.',
          );
          return;
        }

        setState('taken');
        setMessage(payload.reason ?? 'Username deja pris.');
      } catch {
        if (cancelled) return;
        setState('error');
        setMessage('Verification indisponible.');
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized]);

  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-muted-foreground">
        Username unique
      </span>
      <AppInput
        name="username"
        required
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="ex: citoyen_actif"
      />
      <p
        className={
          state === 'available'
            ? 'text-xs text-emerald-700'
            : state === 'taken' || state === 'error'
              ? 'text-xs text-rose-700'
              : 'text-xs text-muted-foreground'
        }
      >
        {message}
      </p>
    </label>
  );
}

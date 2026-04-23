'use client';

import { useState } from 'react';
import { AppButton } from '@/components/app/app-button';
import { AppInput } from '@/components/app/app-input';
import type { ProfileDemographics } from '@/lib/data/authenticated/profile-completion';

export interface DemographicsFormProps {
  action: (formData: FormData) => Promise<void>;
  current: ProfileDemographics;
  /** Today minus 18 years, formatted YYYY-MM-DD — HTML `max` on the date input. */
  maxDob: string;
}

export function DemographicsForm({
  action,
  current,
  maxDob,
}: DemographicsFormProps) {
  const [dob, setDob] = useState<string>(current.date_of_birth ?? '');
  const [postal, setPostal] = useState<string>(current.postal_code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await action(formData);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Enregistrement impossible.',
      );
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <label htmlFor="me-dob" className="block space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Date de naissance (privée — 18 ans minimum)
        </span>
        <AppInput
          id="me-dob"
          name="date_of_birth"
          type="date"
          value={dob}
          onChange={(e) => {
            setDob(e.target.value);
          }}
          max={maxDob}
          required
        />
      </label>

      <label htmlFor="me-postal" className="block space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Code postal (privé — 5 chiffres)
        </span>
        <AppInput
          id="me-postal"
          name="postal_code"
          inputMode="numeric"
          pattern="[0-9]{5}"
          maxLength={5}
          value={postal}
          onChange={(e) => {
            setPostal(e.target.value.replace(/\D/g, '').slice(0, 5));
          }}
          required
        />
      </label>

      {current.resolved_city ? (
        <p className="text-xs text-muted-foreground">
          Ville résolue : <strong>{current.resolved_city}</strong>
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <AppButton
          type="submit"
          disabled={pending || !dob || !/^[0-9]{5}$/.test(postal)}
        >
          {pending ? 'Enregistrement...' : 'Enregistrer'}
        </AppButton>
      </div>
    </form>
  );
}

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

const SEX_OPTIONS: {
  value: NonNullable<ProfileDemographics['sex']>;
  label: string;
}[] = [
  { value: 'F', label: 'Femme' },
  { value: 'M', label: 'Homme' },
  { value: 'other', label: 'Autre' },
];

const EDUCATION_OPTIONS: {
  value: NonNullable<ProfileDemographics['education']>;
  label: string;
}[] = [
  { value: 'none', label: 'Aucun diplôme' },
  { value: 'bac', label: 'Bac' },
  { value: 'bac2', label: 'Bac+2' },
  { value: 'bac3_plus', label: 'Bac+3 et plus' },
];

const CSP_OPTIONS: { value: string; label: string }[] = [
  { value: 'agriculteurs', label: 'Agriculteur·rice' },
  {
    value: 'artisans_commercants_chefs',
    label: 'Artisan, commerçant, chef d’entreprise',
  },
  {
    value: 'cadres_professions_intellectuelles',
    label: 'Cadre, profession intellectuelle',
  },
  { value: 'professions_intermediaires', label: 'Profession intermédiaire' },
  { value: 'employes', label: 'Employé·e' },
  { value: 'ouvriers', label: 'Ouvrier·ière' },
  { value: 'retraites', label: 'Retraité·e' },
  { value: 'sans_activite', label: 'Sans activité professionnelle' },
];

export function DemographicsForm({
  action,
  current,
  maxDob,
}: DemographicsFormProps) {
  const [dob, setDob] = useState<string>(current.date_of_birth ?? '');
  const [postal, setPostal] = useState<string>(current.postal_code ?? '');
  const [sex, setSex] = useState<string>(current.sex ?? '');
  const [csp, setCsp] = useState<string>(current.csp ?? '');
  const [education, setEducation] = useState<string>(current.education ?? '');
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

      <fieldset className="space-y-3 rounded-md border border-border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">
          Optionnel — aide au redressement statistique des sondages
        </legend>

        <label htmlFor="me-sex" className="block space-y-2">
          <span className="text-xs text-muted-foreground">Sexe</span>
          <select
            id="me-sex"
            name="sex"
            value={sex}
            onChange={(e) => {
              setSex(e.target.value);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Non renseigné —</option>
            {SEX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="me-csp" className="block space-y-2">
          <span className="text-xs text-muted-foreground">
            Catégorie socioprofessionnelle (INSEE)
          </span>
          <select
            id="me-csp"
            name="csp"
            value={csp}
            onChange={(e) => {
              setCsp(e.target.value);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Non renseigné —</option>
            {CSP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="me-education" className="block space-y-2">
          <span className="text-xs text-muted-foreground">
            Diplôme le plus élevé
          </span>
          <select
            id="me-education"
            name="education"
            value={education}
            onChange={(e) => {
              setEducation(e.target.value);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Non renseigné —</option>
            {EDUCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

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

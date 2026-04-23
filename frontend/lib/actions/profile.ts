'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createLogger, logError } from '@/lib/logger';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const log = createLogger('profile.demographics');

const POSTAL_RE = /^[0-9]{5}$/;
const GEO_ENDPOINT = 'https://geo.api.gouv.fr/communes';

interface CommuneRow {
  nom?: string;
}

async function resolveCity(postalCode: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GEO_ENDPOINT}?codePostal=${encodeURIComponent(postalCode)}&fields=nom&format=json`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as CommuneRow[];
    return rows[0]?.nom ?? null;
  } catch (err) {
    log.warn(
      { event: 'geo.upstream.fetch_failed', err: String(err) },
      'geo lookup failed — storing null city',
    );
    return null;
  }
}

const SEX_VALUES = new Set(['F', 'M', 'other']);
const EDUCATION_VALUES = new Set(['none', 'bac', 'bac2', 'bac3_plus']);
const CSP_VALUES = new Set([
  'agriculteurs',
  'artisans_commercants_chefs',
  'cadres_professions_intellectuelles',
  'professions_intermediaires',
  'employes',
  'ouvriers',
  'retraites',
  'sans_activite',
]);

function readOptional(
  formData: FormData,
  key: string,
  allowed: Set<string>,
): string | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  return allowed.has(raw) ? raw : null;
}

export async function updateDemographicsAction(formData: FormData) {
  const dob = String(formData.get('date_of_birth') ?? '').trim();
  const postal = String(formData.get('postal_code') ?? '').trim();

  if (!dob) throw new Error('Date of birth required');
  if (!POSTAL_RE.test(postal))
    throw new Error('Invalid postal code (5 digits expected)');

  const sex = readOptional(formData, 'sex', SEX_VALUES);
  const csp = readOptional(formData, 'csp', CSP_VALUES);
  const education = readOptional(formData, 'education', EDUCATION_VALUES);

  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) throw new Error('Authentication required');

  const city = await resolveCity(postal);

  const { error } = await supabase.rpc('rpc_update_profile_demographics', {
    p_date_of_birth: dob,
    p_postal_code: postal,
    p_resolved_city: city,
    p_sex: sex,
    p_csp: csp,
    p_education: education,
  });

  if (error) {
    const message = error.message ?? '';
    if (/minimum age/i.test(message)) {
      throw new Error('Vous devez avoir 18 ans ou plus.');
    }
    if (/postal/i.test(message)) {
      throw new Error('Code postal invalide.');
    }
    logError(log, error, {
      event: 'profile.demographics.rpc_failed',
      user_id: userId,
      message,
    });
    throw new Error('Enregistrement impossible.');
  }

  log.info(
    {
      event: 'profile.demographics.ok',
      user_id: userId,
      postal_code: postal,
      city,
      has_sex: sex !== null,
      has_csp: csp !== null,
      has_education: education !== null,
    },
    'demographics updated',
  );

  revalidatePath('/me');
  redirect('/me?section=profile' as never);
}

export async function dismissCompletionNudgeAction() {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) throw new Error('Authentication required');

  const { error } = await supabase.rpc('rpc_mark_completion_nudge_seen');
  if (error) {
    logError(log, error, {
      event: 'profile.nudge.dismiss_failed',
      user_id: userId,
      message: error.message ?? '',
    });
    throw new Error('Action impossible.');
  }
  log.info(
    { event: 'profile.nudge.dismissed', user_id: userId },
    'completion nudge dismissed',
  );
  revalidatePath('/');
}

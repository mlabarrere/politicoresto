import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface ProfileDemographics {
  date_of_birth: string | null;
  postal_code: string | null;
  resolved_city: string | null;
  sex: 'F' | 'M' | 'other' | null;
  csp: string | null;
  education: 'none' | 'bac' | 'bac2' | 'bac3_plus' | null;
}

export interface ProfileCompletion {
  has_date_of_birth: boolean;
  has_postal_code: boolean;
  has_seen_completion_nudge: boolean;
}

export async function getProfileDemographics(): Promise<ProfileDemographics> {
  const supabase = await createServerSupabaseClient();
  const { data: upp } = await supabase
    .from('user_private_political_profile')
    .select('date_of_birth, postal_code, sex, csp, education')
    .maybeSingle();
  const { data: ap } = await supabase
    .from('app_profile')
    .select('resolved_city')
    .maybeSingle();
  return {
    date_of_birth: upp?.date_of_birth ?? null,
    postal_code: upp?.postal_code ?? null,
    resolved_city: ap?.resolved_city ?? null,
    sex: (upp?.sex ?? null) as ProfileDemographics['sex'],
    csp: upp?.csp ?? null,
    education: (upp?.education ?? null) as ProfileDemographics['education'],
  };
}

export async function getProfileCompletion(): Promise<ProfileCompletion> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .rpc('rpc_get_profile_completion')
    .maybeSingle();
  return {
    has_date_of_birth: Boolean(
      (data as { has_date_of_birth?: boolean } | null)?.has_date_of_birth,
    ),
    has_postal_code: Boolean(
      (data as { has_postal_code?: boolean } | null)?.has_postal_code,
    ),
    has_seen_completion_nudge: Boolean(
      (data as { has_seen_completion_nudge?: boolean } | null)
        ?.has_seen_completion_nudge,
    ),
  };
}

export function isProfileIncomplete(c: ProfileCompletion): boolean {
  return !c.has_date_of_birth || !c.has_postal_code;
}

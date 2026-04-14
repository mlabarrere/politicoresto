import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PrivateProfileRow = {
  user_id: string;
  political_interest_level: number | null;
  notes_private: string | null;
  profile_payload: Record<string, unknown> | null;
  updated_at: string;
};

export async function getVaultSettingsData() {
  const supabase = await createServerSupabaseClient();
  const profileResult = await supabase.rpc("rpc_get_private_political_profile");
  const errors = [profileResult.error].filter(Boolean).map((item) => item?.message).filter(Boolean);

  return {
    profile: (profileResult.data ?? null) as PrivateProfileRow | null,
    error: errors.length ? errors.join(" | ") : null
  };
}

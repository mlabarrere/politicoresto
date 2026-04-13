"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function recordPublicProfileConsent() {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("rpc_record_consent", {
    p_consent_type: "public_profile_visibility",
    p_consent_status: "granted",
    p_policy_version: "v1",
    p_source: "frontend-settings"
  });

  if (error) {
    throw new Error(error.message);
  }
}

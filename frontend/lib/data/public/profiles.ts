import type { PublicProfileScreenData } from "@/lib/types/screens";
import type { PublicProfileView } from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPublicProfileByUsername(
  username: string
): Promise<PublicProfileScreenData | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("v_public_profiles")
    .select("*")
    .ilike("display_name", username.replaceAll("-", " "))
    .limit(1);

  if (error) {
    throw error;
  }

  const profile = data?.[0] ?? null;

  if (!profile) {
    return null;
  }

  return {
    profile: profile as PublicProfileView
  };
}

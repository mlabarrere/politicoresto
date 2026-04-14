"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function upsertPrivateProfileAction(formData: FormData) {
  const interestRaw = String(formData.get("political_interest_level") ?? "").trim();
  const notes = String(formData.get("notes_private") ?? "").trim() || null;
  const socioProfessionalCategory = String(formData.get("socio_professional_category") ?? "").trim() || null;
  const employmentStatus = String(formData.get("employment_status") ?? "").trim() || null;
  const educationLevel = String(formData.get("education_level") ?? "").trim() || null;
  const redirectPath = String(formData.get("redirect_path") ?? "/me/settings").trim() || "/me/settings";

  const level = interestRaw ? Number(interestRaw) : null;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_upsert_private_political_profile", {
    p_declared_partisan_term_id: null,
    p_declared_ideology_term_id: null,
    p_political_interest_level: Number.isFinite(level) ? level : null,
    p_notes_private: notes,
    p_profile_payload: {
      socio_professional_category: socioProfessionalCategory,
      employment_status: employmentStatus,
      education_level: educationLevel
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
}

export async function clearPrivateProfileAction(formData: FormData) {
  const redirectPath = String(formData.get("redirect_path") ?? "/me/settings").trim() || "/me/settings";

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_delete_private_political_profile");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeUsername, validateUsername } from "@/lib/account/username";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeRedirectPath(value: string) {
  if (!value.startsWith("/")) return "/me";
  if (value.startsWith("//")) return "/me";
  return value;
}

export async function upsertAccountIdentityAction(formData: FormData) {
  const redirectPath = safeRedirectPath(String(formData.get("redirect_path") ?? "/me").trim() || "/me");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const usernameInput = String(formData.get("username") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim() || null;
  const isPublicProfileEnabled = String(formData.get("is_public_profile_enabled") ?? "on") === "on";

  if (!displayName) {
    throw new Error("Le nom public est obligatoire.");
  }

  const username = normalizeUsername(usernameInput);
  const usernameError = validateUsername(username);
  if (usernameError) {
    throw new Error(usernameError);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const duplicateResult = await supabase
    .from("app_profile")
    .select("user_id")
    .eq("username", username)
    .neq("user_id", user.id)
    .maybeSingle();

  if (duplicateResult.error) {
    console.error("[account][upsertAccountIdentity] duplicate check failed", {
      message: duplicateResult.error.message,
      code: duplicateResult.error.code
    });
    throw new Error("Enregistrement impossible pour le moment.");
  }

  if (duplicateResult.data) {
    throw new Error("Ce username est deja pris.");
  }

  const { error } = await supabase
    .from("app_profile")
    .update({
      username,
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
      is_public_profile_enabled: isPublicProfileEnabled
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("[account][upsertAccountIdentity] update failed", { message: error.message, code: error.code });
    throw new Error("Enregistrement impossible pour le moment.");
  }

  revalidatePath("/me");
  redirect(redirectPath as never);
}

export async function upsertPrivateProfileAction(formData: FormData) {
  const interestRaw = String(formData.get("political_interest_level") ?? "").trim();
  const notes = String(formData.get("notes_private") ?? "").trim() || null;
  const socioProfessionalCategory = String(formData.get("socio_professional_category") ?? "").trim() || null;
  const employmentStatus = String(formData.get("employment_status") ?? "").trim() || null;
  const educationLevel = String(formData.get("education_level") ?? "").trim() || null;
  const redirectPath = safeRedirectPath(String(formData.get("redirect_path") ?? "/me").trim() || "/me");

  const level = interestRaw ? Number(interestRaw) : null;

  const supabase = await createServerSupabaseClient();
  const rpcPayload: Record<string, unknown> = {
    p_declared_partisan_term_id: null,
    p_declared_ideology_term_id: null,
    p_notes_private: notes,
    p_profile_payload: {
      socio_professional_category: socioProfessionalCategory,
      employment_status: employmentStatus,
      education_level: educationLevel
    }
  };

  if (interestRaw && Number.isFinite(level)) {
    rpcPayload.p_political_interest_level = level;
  }

  const { error } = await supabase.rpc("rpc_upsert_private_political_profile", rpcPayload);

  if (error) {
    console.error("[account][upsertPrivateProfile] rpc failed", { message: error.message, code: error.code });
    throw new Error("Enregistrement impossible pour le moment.");
  }

  revalidatePath("/me");
  redirect(redirectPath as never);
}

export async function clearPrivateProfileAction(formData: FormData) {
  const redirectPath = safeRedirectPath(String(formData.get("redirect_path") ?? "/me").trim() || "/me");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_delete_private_political_profile");

  if (error) {
    console.error("[account][clearPrivateProfile] rpc failed", { message: error.message, code: error.code });
    throw new Error("Operation impossible pour le moment.");
  }

  revalidatePath("/me");
  redirect(redirectPath as never);
}

export async function deactivateAccountAction(formData: FormData) {
  const confirm = String(formData.get("confirm_deactivate") ?? "").trim();
  if (confirm !== "DESACTIVER") {
    throw new Error("Confirmez en saisissant DESACTIVER.");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const { error } = await supabase
    .from("app_profile")
    .update({ profile_status: "limited", is_public_profile_enabled: false })
    .eq("user_id", user.id);

  if (error) {
    console.error("[account][deactivate] update failed", { message: error.message, code: error.code });
    throw new Error("Operation impossible pour le moment.");
  }

  revalidatePath("/me");
  redirect("/me?section=security");
}

export async function deleteAccountAction(formData: FormData) {
  const confirm = String(formData.get("confirm_delete") ?? "").trim();
  if (confirm !== "SUPPRIMER") {
    throw new Error("Confirmez en saisissant SUPPRIMER.");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const { error } = await supabase
    .from("app_profile")
    .update({ profile_status: "deleted", is_public_profile_enabled: false, bio: null })
    .eq("user_id", user.id);

  if (error) {
    console.error("[account][delete] update failed", { message: error.message, code: error.code });
    throw new Error("Operation impossible pour le moment.");
  }

  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/auth/login");
}

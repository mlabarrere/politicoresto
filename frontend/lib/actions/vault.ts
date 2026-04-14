"use server";

import { revalidatePath } from "next/cache";

import {
  resolveVoteHistoryScopeKey,
  VOTE_PARTICIPATION_OPTIONS
} from "@/lib/constants/vote-history-scopes";
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

export async function upsertVoteHistoryAction(formData: FormData) {
  const voteRecordId = String(formData.get("id") ?? "").trim() || null;
  const scopeKey = String(formData.get("vote_history_scope") ?? "").trim();
  const participationStatus = String(formData.get("participation_status") ?? "").trim();
  const voteRoundRaw = String(formData.get("vote_round") ?? "").trim();
  const option = String(formData.get("declared_option_label") ?? "").trim();
  const candidate = String(formData.get("declared_candidate_name") ?? "").trim() || null;
  const locationLabel = String(formData.get("location_label") ?? "").trim() || null;
  const pollingStationLabel = String(formData.get("polling_station_label") ?? "").trim() || null;
  const voteContext = String(formData.get("vote_context") ?? "").trim() || null;
  const redirectPath = String(formData.get("redirect_path") ?? "/me/settings").trim() || "/me/settings";

  const resolvedScope = resolveVoteHistoryScopeKey(scopeKey);
  if (!resolvedScope) {
    throw new Error("Election scope required");
  }
  const allowedParticipation = new Set(VOTE_PARTICIPATION_OPTIONS.map((item) => item.value));
  if (!allowedParticipation.has(participationStatus as (typeof VOTE_PARTICIPATION_OPTIONS)[number]["value"])) {
    throw new Error("Participation status required");
  }
  if (participationStatus === "voted" && !option) {
    throw new Error("Vote option required");
  }

  const voteRound = voteRoundRaw ? Number(voteRoundRaw) : null;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_upsert_private_vote_record", {
    p_vote_record_id: voteRecordId,
    p_election_term_id: null,
    p_territory_id: null,
    p_vote_round: Number.isFinite(voteRound) ? voteRound : null,
    p_declared_option_label: option || participationStatus,
    p_declared_party_term_id: null,
    p_declared_candidate_name: candidate,
    p_location_label: locationLabel,
    p_polling_station_label: pollingStationLabel,
    p_vote_context: {
      ...resolvedScope,
      participation_status: participationStatus,
      vote_context: voteContext
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
}

export async function deleteVoteHistoryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/me/settings").trim() || "/me/settings";

  if (!id) {
    throw new Error("Vote history entry required");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_delete_private_vote_record", { p_vote_record_id: id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
}

export async function upsertSensitiveConsentAction(formData: FormData) {
  const redirectPath = String(formData.get("redirect_path") ?? "/me/settings").trim() || "/me/settings";

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rpc_upsert_sensitive_consent", {
    p_consent_type: "political_sensitive_data",
    p_consent_status: "granted",
    p_policy_version: "v1",
    p_source: "vault-settings"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
}

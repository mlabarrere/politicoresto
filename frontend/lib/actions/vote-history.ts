"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type ChoiceKind =
  | "vote"
  | "blanc"
  | "nul"
  | "abstention"
  | "non_inscrit"
  | "ne_se_prononce_pas";

const VALID_CHOICES: ReadonlySet<ChoiceKind> = new Set([
  "vote",
  "blanc",
  "nul",
  "abstention",
  "non_inscrit",
  "ne_se_prononce_pas"
]);

export async function upsertVoteHistoryAction(input: {
  election_slug: string;
  election_result_id: string | null;
  choice_kind: ChoiceKind;
  confidence?: number | null;
  notes?: string | null;
}) {
  const electionSlug = input.election_slug?.trim();
  const choiceKind = input.choice_kind;

  console.info("[vote-history][upsert] start", {
    electionSlug,
    choiceKind,
    hasResult: Boolean(input.election_result_id)
  });

  if (!electionSlug) {
    throw new Error("Scrutin requis.");
  }
  if (!VALID_CHOICES.has(choiceKind)) {
    throw new Error("Type de choix invalide.");
  }
  if (choiceKind === "vote" && !input.election_result_id) {
    throw new Error("Choix de candidat requis pour un vote.");
  }

  // Pas de auth.getUser() ici : c'est un round-trip reseau vers Supabase Auth
  // (~200ms) deja paye par le middleware sur chaque requete. Le RPC est
  // security definer et raise errcode 28000 si auth.uid() est null — la source
  // de verite est la. On economise ~200ms par click.
  const supabase = await createServerSupabaseClient();

  const t0 = performance.now();
  const { error } = await supabase.rpc("rpc_upsert_vote_history", {
    p_election_slug: electionSlug,
    p_election_result_id: choiceKind === "vote" ? input.election_result_id : null,
    p_choice_kind: choiceKind,
    p_confidence: input.confidence ?? null,
    p_notes: input.notes ?? null
  });
  const rpcMs = Math.round(performance.now() - t0);

  if (error) {
    console.error("[vote-history][upsert] rpc failed", {
      message: error.message,
      code: error.code,
      rpcMs
    });
    if (error.code === "28000") {
      throw new Error("Authentication required");
    }
    throw new Error("Enregistrement impossible pour le moment.");
  }

  console.info("[vote-history][upsert] OK", { electionSlug, choiceKind, rpcMs });
  revalidatePath("/me");
}

export async function deleteVoteHistoryAction(electionSlug: string) {
  const slug = (electionSlug ?? "").trim();
  console.info("[vote-history][delete] start", { electionSlug: slug });

  if (!slug) {
    throw new Error("Scrutin requis.");
  }

  // Idem upsert : pas de auth.getUser() redondant, le RPC est security definer
  // et raise 28000 si auth.uid() est null.
  const supabase = await createServerSupabaseClient();

  const t0 = performance.now();
  const { error } = await supabase.rpc("rpc_delete_vote_history", {
    p_election_slug: slug
  });
  const rpcMs = Math.round(performance.now() - t0);

  if (error) {
    console.error("[vote-history][delete] rpc failed", {
      message: error.message,
      code: error.code,
      rpcMs
    });
    if (error.code === "28000") {
      throw new Error("Authentication required");
    }
    throw new Error("Suppression impossible pour le moment.");
  }

  console.info("[vote-history][delete] OK", { electionSlug: slug, rpcMs });
  revalidatePath("/me");
}

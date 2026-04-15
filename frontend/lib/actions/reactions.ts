"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const REACTION_SIDE_TO_TYPE = {
  gauche: "upvote",
  droite: "downvote"
} as const;

export async function reactAction(formData: FormData) {
  const targetType = String(formData.get("target_type") ?? "").trim();
  const targetId = String(formData.get("target_id") ?? "").trim();
  const side = String(formData.get("reaction_side") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!targetType || !targetId || !side) {
    throw new Error("Reaction invalid");
  }

  if (targetType !== "thread_post" && targetType !== "comment") {
    throw new Error("Reaction target invalid");
  }

  if (side !== "gauche" && side !== "droite") {
    throw new Error("Reaction side invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("react_post", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reaction_type: REACTION_SIDE_TO_TYPE[side]
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

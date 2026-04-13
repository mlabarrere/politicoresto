"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function reactAction(formData: FormData) {
  const targetType = String(formData.get("target_type") ?? "").trim();
  const targetId = String(formData.get("target_id") ?? "").trim();
  const reactionType = String(formData.get("reaction_type") ?? "").trim();
  const redirectPath = String(formData.get("redirect_path") ?? "/").trim() || "/";

  if (!targetType || !targetId || !reactionType) {
    throw new Error("Reaction invalid");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("react_post", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reaction_type: reactionType
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(redirectPath);
  revalidatePath("/");
}

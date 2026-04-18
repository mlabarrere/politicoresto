import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils/safe-path";

export async function requireSession(nextPath = "/me") {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/auth/login?next=${encodeURIComponent(safeNextPath(nextPath, "/me"))}`);
  }

  return { supabase, session };
}

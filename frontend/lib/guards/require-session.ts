import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNextPath(nextPath: string) {
  const fallback = "/me";
  if (!nextPath.startsWith("/")) return fallback;
  if (nextPath.startsWith("//")) return fallback;
  if (nextPath.includes("://")) return fallback;

  try {
    const url = new URL(nextPath, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export async function requireSession(nextPath = "/me") {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/auth/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  }

  return { supabase, session };
}

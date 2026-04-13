"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function OAuthButtons({ next = "/me" }: { next?: string }) {
  const [pending, setPending] = useState<"google" | null>(null);

  async function handleProvider() {
    const supabase = createBrowserSupabaseClient();
    setPending("google");

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next
    )}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });

    if (error) {
      setPending(null);
      window.alert(error.message);
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
      return;
    }

    setPending(null);
    window.alert("Impossible d'ouvrir la connexion Google.");
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => handleProvider()} disabled={pending !== null}>
        {pending === "google" ? "Connexion..." : "Continuer avec Google"}
      </Button>
    </div>
  );
}

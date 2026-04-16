"use client";

import { useState } from "react";

import { AppButton } from "@/components/app/app-button";

function normalizeNextPath(next?: string) {
  const fallback = "/";
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;

  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function OAuthButtons({
  next = "/me",
  initialError = null
}: {
  next?: string;
  initialError?: string | null;
}) {
  const [pending, setPending] = useState<"google" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH !== "false";

  async function handleProvider() {
    if (!googleEnabled) {
      setErrorMessage("Connexion Google indisponible. Google OAuth doit etre active cote Supabase.");
      return;
    }

    const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
    const supabase = createBrowserSupabaseClient();
    setErrorMessage(null);
    setPending("google");
    const safeNext = normalizeNextPath(next);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });

    if (error) {
      setPending(null);
      const normalized = `${error.message}`.toLowerCase();
      if (normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) {
        setErrorMessage(
          "Connexion Google indisponible. Activez le provider Google dans Supabase Auth."
        );
        return;
      }
      setErrorMessage("Connexion Google impossible. Verifiez la configuration OAuth Supabase.");
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
      return;
    }

    setPending(null);
    setErrorMessage("Impossible d'ouvrir la connexion Google.");
  }

  return (
    <div className="flex flex-col gap-3">
      <AppButton onClick={() => handleProvider()} disabled={pending !== null || !googleEnabled}>
        {pending === "google" ? "Connexion..." : "Continuer avec Google"}
      </AppButton>
      {errorMessage ? (
        <p className="text-xs leading-6 text-amber-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {!googleEnabled ? (
        <p className="text-xs leading-6 text-muted-foreground">
          Activez `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=true` une fois Google configure dans Supabase.
        </p>
      ) : null}
    </div>
  );
}

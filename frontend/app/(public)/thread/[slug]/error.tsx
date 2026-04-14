"use client";

import { useEffect } from "react";
import type { Route } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { ScreenState } from "@/components/layout/screen-state";

export default function ThreadError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer>
      <ScreenState
        title="Le thread n'a pas pu etre charge"
        body="La page publique du thread reste momentanement indisponible. Vous pouvez relancer la lecture ou revenir vers l'index."
        actionHref={"/" as Route}
        actionLabel="Retour au feed"
        retryLabel="Reessayer"
        onRetry={reset}
      />
    </PageContainer>
  );
}

"use client";

import { useEffect } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { ScreenState } from "@/components/layout/screen-state";

export default function TopicError({
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
        title="Le sujet n'a pas pu etre charge"
        body="La page publique du sujet reste momentanement indisponible. Vous pouvez relancer la lecture ou revenir vers l'index."
        actionHref="/topics"
        actionLabel="Retour aux sujets"
        retryLabel="Reessayer"
        onRetry={reset}
      />
    </PageContainer>
  );
}

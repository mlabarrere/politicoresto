"use client";

import { useEffect } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";

export default function SpaceError({
  error
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer>
      <EmptyState
        title="Erreur de chargement de l’espace"
        body="La page espace n’a pas pu être reconstruite à partir du contrat public actuel."
      />
    </PageContainer>
  );
}

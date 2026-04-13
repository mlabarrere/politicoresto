"use client";

import { useEffect } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";

export default function PollError({
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
        title="Erreur de chargement du sondage"
        body="Le frontend n’a pas pu assembler le détail du sondage depuis les contrats publics disponibles."
      />
    </PageContainer>
  );
}

"use client";

import { useEffect } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageContainer } from "@/components/layout/page-container";

export default function PublicProfileError({
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
        title="Erreur de chargement du profil"
        body="Le profil public n’a pas pu être chargé. Réessayez plus tard ou vérifiez le contrat exposé côté Supabase."
      />
    </PageContainer>
  );
}

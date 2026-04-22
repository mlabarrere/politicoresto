'use client';

import { useEffect } from 'react';
import type { Route } from 'next';
import { PageContainer } from '@/components/layout/page-container';
import { ScreenState } from '@/components/layout/screen-state';
import { clientLog } from '@/lib/client-log';

const log = clientLog('post-error-boundary');

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error('post_error_boundary.rendered', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <PageContainer>
      <ScreenState
        title="Le post n'a pas pu etre charge"
        body="La page publique du post reste momentanement indisponible. Vous pouvez relancer la lecture ou revenir vers l'index."
        actionHref={'/' as Route}
        actionLabel="Retour au feed"
        retryLabel="Reessayer"
        onRetry={reset}
      />
    </PageContainer>
  );
}

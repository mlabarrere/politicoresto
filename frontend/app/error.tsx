'use client';

import { useEffect } from 'react';
import { clientLog } from '@/lib/client-log';

const log = clientLog('error-boundary');

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error('error_boundary.rendered', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h2 className="text-lg font-semibold">Une erreur est survenue.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.digest ? `Référence: ${error.digest}` : 'Merci de réessayer.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md border px-4 py-2 text-sm"
      >
        Réessayer
      </button>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- client-side boundary; no logger import available
    console.error('[global-error-boundary] rendered fallback', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div className="mx-auto max-w-xl p-8 text-center">
          <h2 className="text-lg font-semibold">Erreur critique.</h2>
          <p className="mt-2 text-sm">
            {error.digest
              ? `Référence: ${error.digest}`
              : "L'application a rencontré un problème."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-md border px-4 py-2 text-sm"
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client components cannot import the server logger directly; we POST
    // to a reporting endpoint. For now, preserve the error in the console
    // with a structured payload so it surfaces in Vercel client logs.
    // Session 3 will add a `/api/_log` endpoint for client→server log forwarding.
    // eslint-disable-next-line no-console -- client-side boundary; no logger import available
    console.error("[error-boundary] rendered fallback", {
      message: error.message,
      digest: error.digest,
      stack: error.stack
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h2 className="text-lg font-semibold">Une erreur est survenue.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.digest ? `Référence: ${error.digest}` : "Merci de réessayer."}
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

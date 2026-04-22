import Link from 'next/link';
import { safeNextPath } from '@/lib/utils/safe-path';

function reasonMessage(reason?: string) {
  switch (reason) {
    case 'oauth_missing_code':
      return "La connexion a échoué : le fournisseur OAuth n'a pas renvoyé de code. Veuillez réessayer.";
    case 'oauth_exchange_failed':
      return "La session n'a pas pu être créée. Veuillez réessayer.";
    default:
      return "Une erreur est survenue pendant l'authentification. Veuillez réessayer.";
  }
}

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; next?: string }>;
}) {
  const { reason, next } = await searchParams;
  const safeNext = safeNextPath(next);
  const retryHref =
    safeNext === '/'
      ? { pathname: '/auth/login' as const }
      : { pathname: '/auth/login' as const, query: { next: safeNext } };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Erreur d&apos;authentification
        </h1>
        <p className="text-sm text-muted-foreground">{reasonMessage(reason)}</p>
        <Link
          href={retryHref}
          className="inline-block rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          Retourner à la connexion
        </Link>
      </div>
    </div>
  );
}

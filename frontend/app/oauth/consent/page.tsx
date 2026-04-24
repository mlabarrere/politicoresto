/**
 * OAuth 2.1 consent screen for the Supabase-hosted Authorization Server.
 *
 * Flow: Claude Desktop (via `mcp-remote`) hits `/auth/v1/oauth/authorize`.
 * Supabase validates the request, then redirects the browser to
 * `${site_url}${authorization_url_path}?authorization_id=...` — this page.
 * We resolve the authenticated user (or bounce to login), fetch the
 * authorization details, and present Approve / Deny buttons. The form
 * POSTs to `/api/oauth/decision` which calls
 * `supabase.auth.oauth.{approve,deny}Authorization()` and redirects back
 * to the OAuth client.
 */
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('oauth.consent');

interface ConsentPageProps {
  searchParams: Promise<{ authorization_id?: string }>;
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const { authorization_id: authorizationId } = await searchParams;

  if (!authorizationId) {
    return (
      <Shell
        title="Demande invalide"
        body="Aucun identifiant d'autorisation n'a été transmis."
      />
    );
  }

  const supabase = await createServerSupabaseClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    const loginUrl = new URL('/auth/login', 'http://placeholder');
    loginUrl.searchParams.set('next', next);
    const path = `${loginUrl.pathname}?${loginUrl.searchParams.toString()}`;
    // typedRoutes: redirect's parameter is RouteImpl<string> which rejects
    // arbitrary runtime-built paths even though the underlying impl accepts
    // any string. Cast through `never` to satisfy both lint and tsc.
    redirect(path as never);
  }

  const { data, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) {
    log.warn(
      {
        event: 'oauth.consent.details_failed',
        authorization_id: authorizationId,
        message: error?.message,
      },
      'getAuthorizationDetails failed',
    );
    return (
      <Shell
        title="Autorisation invalide"
        body={
          error?.message ??
          'Impossible de récupérer les détails de cette autorisation.'
        }
      />
    );
  }

  // Already consented — Supabase returns a straight redirect URL pointing
  // back to the OAuth client (e.g. mcp-remote's loopback callback).
  if ('redirect_url' in data) {
    // External URL provided by Supabase OAuth server (loopback callback
    // for mcp-remote, etc.) — not a typed app route.
    redirect(data.redirect_url as never);
  }

  const clientName = data.client.name || data.client.id;
  const scopes = (data.scope ?? '').split(/\s+/).filter(Boolean);

  log.info(
    {
      event: 'oauth.consent.displayed',
      authorization_id: authorizationId,
      user_id: user.id,
      client_id: data.client.id,
    },
    'consent screen shown',
  );

  return (
    <Shell
      title={`Autoriser ${clientName} ?`}
      body={`Cette application demande l'accès à votre compte PoliticoResto. Vous pouvez révoquer l'accès à tout moment dans votre profil.`}
    >
      <dl className="mt-6 grid grid-cols-1 gap-3 text-sm text-muted-foreground">
        <div>
          <dt className="font-medium text-foreground">Application</dt>
          <dd>{clientName}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Redirection</dt>
          <dd className="break-all">{data.redirect_uri}</dd>
        </div>
        {scopes.length > 0 && (
          <div>
            <dt className="font-medium text-foreground">
              Permissions demandées
            </dt>
            <dd>
              <ul className="mt-1 list-disc pl-5">
                {scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      <form
        action="/api/oauth/decision"
        method="POST"
        className="mt-8 flex gap-3"
      >
        <input type="hidden" name="authorization_id" value={authorizationId} />
        <button
          type="submit"
          name="decision"
          value="approve"
          className="flex-1 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Autoriser
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className="flex-1 rounded-md border border-border px-4 py-2 font-medium hover:bg-muted"
        >
          Refuser
        </button>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {children}
      </div>
    </div>
  );
}

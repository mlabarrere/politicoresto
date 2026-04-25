import Link from 'next/link';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { EmptyState } from '@/components/layout/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { markNotificationReadAction } from '@/lib/actions/pronos';
import { requireSession } from '@/lib/guards/require-session';
import { getAuthUserId } from '@/lib/supabase/auth-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata = { title: 'Notifications — PoliticoResto' };

interface NotifRow {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  prono_published: 'Votre demande a été publiée',
  prono_rejected: 'Votre demande a été refusée',
  prono_resolved: 'Un de vos pronostics a été résolu',
  prono_voided: 'Un de vos pronostics a été annulé',
  prono_option_added: 'Une option a été ajoutée',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function NotificationsPage() {
  await requireSession('/me/notifications');
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    return (
      <PageContainer>
        <EmptyState
          title="Session expirée"
          body="Reconnectez-vous pour consulter vos notifications."
        />
      </PageContainer>
    );
  }

  const { data, error } = await supabase
    .from('user_notification')
    .select('id, kind, payload, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title="Notifications indisponibles"
          body={`Erreur SQL : ${error.message}`}
        />
      </PageContainer>
    );
  }
  const rows = (data ?? []) as NotifRow[];
  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Profil
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} non lue${unread > 1 ? 's' : ''}`
              : 'Tout est à jour.'}
          </p>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucune notification"
            body="Vous serez notifié ici lorsqu'une action concerne un pronostic auquel vous avez participé."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const slug =
                typeof row.payload.topic_slug === 'string'
                  ? row.payload.topic_slug
                  : null;
              const reason =
                typeof row.payload.reason === 'string'
                  ? row.payload.reason
                  : null;
              const optionLabel =
                typeof row.payload.label === 'string'
                  ? row.payload.label
                  : null;
              return (
                <AppCard
                  key={row.id}
                  className={`space-y-2 ${row.is_read ? '' : 'border-foreground/40'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {KIND_LABEL[row.kind] ?? row.kind}
                      {row.is_read ? null : (
                        <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
                          Nouveau
                        </span>
                      )}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(row.created_at)}
                    </span>
                  </div>
                  {optionLabel ? (
                    <p className="text-sm text-muted-foreground">
                      Option ajoutée :{' '}
                      <span className="font-medium text-foreground">
                        {optionLabel}
                      </span>
                    </p>
                  ) : null}
                  {reason ? (
                    <p className="text-sm text-muted-foreground">
                      Raison : {reason}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {slug ? (
                      <Link
                        href={`/post/${slug}`}
                        className="text-xs underline"
                      >
                        Ouvrir le pronostic
                      </Link>
                    ) : null}
                    {!row.is_read ? (
                      <form action={markNotificationReadAction}>
                        <input
                          type="hidden"
                          name="notification_id"
                          value={row.id}
                        />
                        <AppButton type="submit" variant="ghost" size="sm">
                          Marquer comme lu
                        </AppButton>
                      </form>
                    ) : null}
                  </div>
                </AppCard>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

import { notFound } from 'next/navigation';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { AppInput } from '@/components/app/app-input';
import { EmptyState } from '@/components/layout/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { publishPronoAction, rejectPronoAction } from '@/lib/actions/pronos';
import { requireSession } from '@/lib/guards/require-session';
import { isModeratorClaim } from '@/lib/supabase/auth-role';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface QueueRow {
  topic_id: string;
  topic_slug: string;
  title: string;
  requested_at: string;
  question_id: string;
  question_text: string;
  allow_multiple: boolean;
  requested_by: string;
  requested_by_username: string | null;
  requested_by_display_name: string;
  option_count: number;
}

export default async function AdminPronosPage() {
  await requireSession('/admin/pronos');
  const supabase = await createServerSupabaseClient();
  const isModo = await isModeratorClaim(supabase);
  // Hide the route to non-moderators behind a 404 — the SQL view is also
  // gated by `is_moderator()`, so this is defence-in-depth.
  if (!isModo) notFound();

  const { data, error } = await supabase
    .from('v_prono_admin_queue')
    .select('*');
  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title="File de modération indisponible"
          body={`Erreur SQL : ${error.message}`}
        />
      </PageContainer>
    );
  }

  const rows = (data ?? []) as QueueRow[];

  // Open pronos awaiting resolution. Cheap query — no aggregation, just
  // a topic.topic_status filter joined to prono_question.
  const { data: openRows } = await supabase
    .from('prono_question')
    .select(
      'id, topic_id, question_text, topic:topic!inner(slug, title, topic_status)',
    )
    .eq('topic.topic_status', 'open')
    .order('created_at', { ascending: false });

  interface OpenRowWire {
    id: string;
    topic_id: string;
    question_text: string;
    topic:
      | { slug: string; title: string; topic_status: string }
      | { slug: string; title: string; topic_status: string }[]
      | null;
  }
  interface OpenRow {
    id: string;
    topic_id: string;
    question_text: string;
    topic: { slug: string; title: string; topic_status: string };
  }
  const opens: OpenRow[] = ((openRows ?? []) as unknown as OpenRowWire[])
    .map((r) => {
      const t = Array.isArray(r.topic) ? r.topic[0] : r.topic;
      return t ? { ...r, topic: t } : null;
    })
    .filter((r): r is OpenRow => r !== null);

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Modération
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Demandes de pronostics ({rows.length})
          </h1>
          <p className="text-sm text-muted-foreground">
            Validez ou refusez chaque demande. Les options « Autre »
            apparaîtront automatiquement à la publication.
          </p>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucune demande en attente"
            body="Les nouvelles demandes apparaîtront ici dès qu'un utilisateur en soumettra."
          />
        ) : (
          rows.map((row) => (
            <AppCard key={row.topic_id} className="space-y-3">
              <header className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Demandé par{' '}
                  <span className="font-medium text-foreground">
                    {row.requested_by_username ?? row.requested_by_display_name}
                  </span>{' '}
                  · {new Date(row.requested_at).toLocaleString('fr-FR')}
                </p>
                <h2 className="text-lg font-semibold text-foreground">
                  {row.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {row.question_text}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.option_count} options · multi-réponses :{' '}
                  {row.allow_multiple ? 'oui' : 'non'}
                </p>
              </header>

              <div className="flex flex-wrap items-end gap-3">
                <form action={publishPronoAction} className="contents">
                  <input type="hidden" name="topic_id" value={row.topic_id} />
                  <AppButton type="submit">Publier</AppButton>
                </form>
                <form
                  action={rejectPronoAction}
                  className="flex flex-1 items-end gap-2"
                >
                  <input type="hidden" name="topic_id" value={row.topic_id} />
                  <label
                    htmlFor={`reject-reason-${row.topic_id}`}
                    className="flex-1 space-y-1"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      Motif de refus
                    </span>
                    <AppInput
                      id={`reject-reason-${row.topic_id}`}
                      name="reason"
                      required
                      placeholder="Hors charte éditoriale, doublon, etc."
                    />
                  </label>
                  <AppButton type="submit" variant="secondary">
                    Refuser
                  </AppButton>
                </form>
                <AppButton variant="ghost" href={`/post/${row.topic_slug}`}>
                  Ouvrir la discussion
                </AppButton>
              </div>
            </AppCard>
          ))
        )}

        <header className="space-y-1 pt-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Pronostics ouverts ({opens.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Ouvrez la page d&apos;un pronostic pour le résoudre ou
            l&apos;annuler.
          </p>
        </header>
        {opens.length === 0 ? (
          <EmptyState
            title="Aucun pronostic ouvert"
            body="Les pronostics publiés apparaîtront ici tant qu'ils ne sont pas résolus."
          />
        ) : (
          opens.map((row) => (
            <AppCard key={row.id} className="flex flex-wrap items-center gap-3">
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-medium text-foreground">
                  {row.topic.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {row.question_text}
                </p>
              </div>
              <AppButton href={`/admin/pronos/${row.topic_id}`}>
                Modérer
              </AppButton>
              <AppButton variant="ghost" href={`/post/${row.topic.slug}`}>
                Page publique
              </AppButton>
            </AppCard>
          ))
        )}
      </div>
    </PageContainer>
  );
}

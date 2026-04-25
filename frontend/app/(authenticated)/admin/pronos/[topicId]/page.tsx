import { notFound } from 'next/navigation';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { AppInput } from '@/components/app/app-input';
import { AppTextarea } from '@/components/app/app-textarea';
import { EmptyState } from '@/components/layout/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { resolvePronoAction } from '@/lib/actions/pronos';
import { getPronoSummaryByTopicId } from '@/lib/data/public/pronos';
import { requireSession } from '@/lib/guards/require-session';
import { isModeratorClaim } from '@/lib/supabase/auth-role';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AdminPronoDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  await requireSession('/admin/pronos');
  const supabase = await createServerSupabaseClient();
  const isModo = await isModeratorClaim(supabase);
  if (!isModo) notFound();

  const { topicId } = await params;
  const summary = await getPronoSummaryByTopicId(topicId, { supabase });
  if (!summary) notFound();

  const isOpen = summary.topic_status === 'open';
  const isResolved = summary.resolution_kind !== null;

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Modération · pronostic
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {summary.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {summary.question_text}
          </p>
          <p className="text-xs text-muted-foreground">
            Statut : {summary.topic_status}
            {summary.resolution_kind
              ? ` · résolu (${summary.resolution_kind})`
              : ''}
            {' · '}
            {summary.total_bets} pari{summary.total_bets > 1 ? 's' : ''}
          </p>
        </header>

        {isResolved ? (
          <EmptyState
            title="Pronostic déjà résolu"
            body="La résolution est immuable. Pour une correction, créer un nouveau pronostic."
          />
        ) : null}

        {!isOpen && !isResolved ? (
          <EmptyState
            title="Pronostic indisponible pour résolution"
            body={`Statut actuel : ${summary.topic_status}. Seuls les pronostics ouverts peuvent être résolus.`}
          />
        ) : null}

        {isOpen ? (
          <AppCard className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Trancher le pronostic
            </h2>
            <p className="text-xs text-muted-foreground">
              Sélectionnez la (ou les) option(s) gagnante(s){' '}
              {summary.allow_multiple
                ? '(plusieurs autorisées)'
                : '(une seule autorisée)'}
              . Les paris postérieurs à l&apos;horodatage de fermeture seront
              ignorés au scoring.
            </p>

            <form action={resolvePronoAction} className="space-y-4">
              <input
                type="hidden"
                name="question_id"
                value={summary.question_id}
              />
              <input
                type="hidden"
                name="topic_slug"
                value={summary.topic_slug}
              />
              <input type="hidden" name="resolution_kind" value="resolved" />

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-muted-foreground">
                  Option(s) gagnante(s)
                </legend>
                <div className="space-y-1">
                  {summary.options
                    .filter((option) => option.is_active)
                    .map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <input
                          type={summary.allow_multiple ? 'checkbox' : 'radio'}
                          name="winning_option_ids"
                          value={option.id}
                          required={!summary.allow_multiple}
                        />
                        <span>{option.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {Math.round(option.share * 100)}% · {option.bet_count}{' '}
                          pari
                          {option.bet_count > 1 ? 's' : ''}
                        </span>
                      </label>
                    ))}
                </div>
              </fieldset>

              <label
                htmlFor="resolve-cutoff"
                className="block space-y-1 text-sm"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  Horodatage de fermeture (laisser vide = maintenant)
                </span>
                <AppInput
                  id="resolve-cutoff"
                  name="betting_cutoff_at"
                  type="datetime-local"
                />
              </label>

              <label htmlFor="resolve-note" className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  Note de résolution (optionnel)
                </span>
                <AppTextarea
                  id="resolve-note"
                  name="resolution_note"
                  rows={3}
                  placeholder="Source / contexte de la décision."
                />
              </label>

              <AppButton type="submit">Trancher</AppButton>
            </form>
          </AppCard>
        ) : null}

        {isOpen ? (
          <AppCard className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Annuler le pronostic
            </h2>
            <p className="text-xs text-muted-foreground">
              Les paris sont conservés en lecture mais ne comptent pas au score.
              Une raison est requise et sera affichée publiquement.
            </p>
            <form action={resolvePronoAction} className="space-y-3">
              <input
                type="hidden"
                name="question_id"
                value={summary.question_id}
              />
              <input
                type="hidden"
                name="topic_slug"
                value={summary.topic_slug}
              />
              <input type="hidden" name="resolution_kind" value="voided" />
              <label htmlFor="void-reason" className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  Raison de l&apos;annulation
                </span>
                <AppInput
                  id="void-reason"
                  name="void_reason"
                  required
                  placeholder="Événement reporté, doublon, sortie de scope, …"
                />
              </label>
              <AppButton type="submit" variant="secondary">
                Annuler le pronostic
              </AppButton>
            </form>
          </AppCard>
        ) : null}

        <AppButton variant="ghost" href={`/post/${summary.topic_slug}`}>
          Voir la page publique
        </AppButton>
      </div>
    </PageContainer>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppBanner } from '@/components/app/app-banner';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { AppInput } from '@/components/app/app-input';
import { AppSelect } from '@/components/app/app-select';
import { AppTabs } from '@/components/app/app-tabs';
import { AppTextarea } from '@/components/app/app-textarea';
import { clientLog } from '@/lib/client-log';
import { cn } from '@/lib/utils';
import type { SubjectView } from '@/lib/types/screens';

const log = clientLog('post-composer');

const DRAFT_KEY = 'politicoresto.post.draft.v5';

const PARTY_OPTIONS = [
  { slug: 'lfi', label: '🔴 LFI' },
  { slug: 'ps', label: '🌹 PS' },
  { slug: 'ecologistes', label: '🌿 Écologistes' },
  { slug: 'renaissance', label: '🟡 Renaissance' },
  { slug: 'modem', label: '🟡 MoDem' },
  { slug: 'horizons', label: '🟡 Horizons' },
  { slug: 'lr', label: '🔵 LR' },
  { slug: 'udr', label: '🔵 UDR' },
  { slug: 'rn', label: '⬛ RN' },
  { slug: 'reconquete', label: '⬛ Reconquête' },
];

type ComposerMode = 'post' | 'poll' | 'prono';

interface PostDraft {
  title: string;
  body: string;
  source_url: string;
  subject_ids: string[];
  party_tags: string[];
  mode: ComposerMode;
  poll_question: string;
  poll_deadline_hours: string;
  poll_options: string[];
  prono_question: string;
  prono_options: string[];
  prono_allow_multiple: boolean;
}

function buildDefaultDraft(): PostDraft {
  return {
    title: '',
    body: '',
    source_url: '',
    subject_ids: [],
    party_tags: [],
    mode: 'post',
    poll_question: '',
    poll_deadline_hours: '24',
    poll_options: ['', ''],
    prono_question: '',
    prono_options: ['', ''],
    prono_allow_multiple: false,
  };
}

function normalizeMode(value: unknown): ComposerMode {
  return value === 'poll' || value === 'prono' ? value : 'post';
}

export function PostComposer({
  action,
  pronoAction,
  redirectPath = '/',
  initialError = null,
  subjects = [],
}: {
  action: (formData: FormData) => Promise<void>;
  pronoAction?: (formData: FormData) => Promise<void>;
  redirectPath?: string;
  initialError?: string | null;
  subjects?: SubjectView[];
}) {
  const [draft, setDraft] = useState<PostDraft>(buildDefaultDraft);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [draftSaveMode, setDraftSaveMode] = useState<'auto' | 'manual'>('auto');

  function persistDraft(nextDraft: PostDraft, mode: 'auto' | 'manual') {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft));
    setLastSavedAt(
      new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
    setDraftSaveMode(mode);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<PostDraft>;
      setDraft({
        ...buildDefaultDraft(),
        title: parsed.title ?? '',
        body: parsed.body ?? '',
        source_url: parsed.source_url ?? '',
        subject_ids: Array.isArray(parsed.subject_ids)
          ? parsed.subject_ids.map(String)
          : [],
        party_tags: Array.isArray(parsed.party_tags)
          ? parsed.party_tags.map(String)
          : [],
        mode: normalizeMode(parsed.mode),
        poll_question: parsed.poll_question ?? '',
        poll_deadline_hours: parsed.poll_deadline_hours ?? '24',
        poll_options:
          Array.isArray(parsed.poll_options) && parsed.poll_options.length >= 2
            ? parsed.poll_options.map((entry) => String(entry ?? ''))
            : ['', ''],
        prono_question: parsed.prono_question ?? '',
        prono_options:
          Array.isArray(parsed.prono_options) &&
          parsed.prono_options.length >= 2
            ? parsed.prono_options.map((entry) => String(entry ?? ''))
            : ['', ''],
        prono_allow_multiple: parsed.prono_allow_multiple === true,
      });
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistDraft(draft, 'auto');
  }, [draft]);

  useEffect(() => {
    if (!initialError) return;
    log.error('post_composer.initial_error', { message: initialError });
  }, [initialError]);

  const draftState = useMemo(() => {
    if (
      !draft.title.trim() &&
      !draft.body.trim() &&
      !draft.poll_question.trim()
    )
      return 'Vide';
    const prefix =
      draftSaveMode === 'manual' ? 'Sauvegarde manuelle' : 'Sauvegarde auto';
    return `${prefix} ${lastSavedAt ?? ''}`.trim();
  }, [
    draft.body,
    draft.poll_question,
    draft.title,
    draftSaveMode,
    lastSavedAt,
  ]);

  function toggleSubject(id: string) {
    setDraft((prev) => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(id)
        ? prev.subject_ids.filter((s) => s !== id)
        : [...prev.subject_ids, id],
    }));
  }

  function toggleParty(slug: string) {
    setDraft((prev) => {
      if (prev.party_tags.includes(slug)) {
        return {
          ...prev,
          party_tags: prev.party_tags.filter((p) => p !== slug),
        };
      }
      if (prev.party_tags.length >= 3) return prev;
      return { ...prev, party_tags: [...prev.party_tags, slug] };
    });
  }

  const postTab = (
    <div className="space-y-4">
      <label htmlFor="post-composer-body" className="block space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Corps (Markdown)
        </span>
        <AppTextarea
          id="post-composer-body"
          name="body"
          required={draft.mode === 'post'}
          rows={9}
          value={draft.body}
          onChange={(event) => {
            setDraft((prev) => ({ ...prev, body: event.target.value }));
          }}
          placeholder={
            '# Votre position\n\nExpliquez votre point de vue avec du **Markdown**.'
          }
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Format accepte: Markdown (titres, listes, liens, gras, italique).
        </p>
      </label>
    </div>
  );

  const pollTab = (
    <div className="space-y-4">
      <AppBanner
        title="Mode sondage"
        body="Deux resultats seront affiches: version brute et version redressee automatiquement selon l'historique de vote des repondants."
      />

      <section className="space-y-3 rounded-xl border border-dashed border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Configuration du sondage
        </p>

        <label
          htmlFor="post-composer-poll-question"
          className="block space-y-2"
        >
          <span className="text-xs font-medium text-muted-foreground">
            Question
          </span>
          <AppInput
            id="post-composer-poll-question"
            name="poll_question"
            required={draft.mode === 'poll'}
            value={draft.poll_question}
            onChange={(event) => {
              setDraft((prev) => ({
                ...prev,
                poll_question: event.target.value,
              }));
            }}
            placeholder="Question unique"
          />
        </label>

        <label
          htmlFor="post-composer-poll-deadline"
          className="block space-y-2"
        >
          <span className="text-xs font-medium text-muted-foreground">
            Deadline
          </span>
          <AppSelect
            id="post-composer-poll-deadline"
            name="poll_deadline_hours"
            value={draft.poll_deadline_hours}
            onChange={(event) => {
              setDraft((prev) => ({
                ...prev,
                poll_deadline_hours: event.target.value,
              }));
            }}
          >
            <option value="6">6h</option>
            <option value="12">12h</option>
            <option value="24">24h</option>
            <option value="36">36h</option>
            <option value="48">48h</option>
          </AppSelect>
        </label>

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Options
          </span>
          {draft.poll_options.map((option, index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key -- poll options are plain editable strings with no stable id; reordering is not supported, only append/remove-by-index
              key={`poll-option-${index}`}
              className="flex items-center gap-2"
            >
              <AppInput
                required={draft.mode === 'poll' && index < 2}
                name="poll_options"
                value={option}
                onChange={(event) => {
                  const next = [...draft.poll_options];
                  next[index] = event.target.value;
                  setDraft((prev) => ({ ...prev, poll_options: next }));
                }}
                placeholder={`Option ${index + 1}`}
              />
              {draft.poll_options.length > 2 ? (
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft((prev) => ({
                      ...prev,
                      poll_options: prev.poll_options.filter(
                        (_, idx) => idx !== index,
                      ),
                    }));
                  }}
                >
                  Retirer
                </AppButton>
              ) : null}
            </div>
          ))}
        </div>

        <AppButton
          type="button"
          variant="secondary"
          onClick={() => {
            setDraft((prev) => ({
              ...prev,
              poll_options: [...prev.poll_options, ''],
            }));
          }}
        >
          Ajouter option
        </AppButton>
      </section>
    </div>
  );

  const pronoTab = (
    <div className="space-y-4">
      <AppBanner
        title="Demande de pronostic"
        body="Une demande publique sera publiée. PoliticoResto valide ou refuse, puis ouvre les paris. L'option « Autre » est ajoutée automatiquement."
      />

      <section className="space-y-3 rounded-xl border border-dashed border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pronostic à proposer
        </p>

        <label
          htmlFor="post-composer-prono-question"
          className="block space-y-2"
        >
          <span className="text-xs font-medium text-muted-foreground">
            Question
          </span>
          <AppInput
            id="post-composer-prono-question"
            name="prono_question"
            required={draft.mode === 'prono'}
            value={draft.prono_question}
            onChange={(event) => {
              setDraft((prev) => ({
                ...prev,
                prono_question: event.target.value,
              }));
            }}
            placeholder="Bayrou sera-t-il toujours premier ministre au 31/12/2026 ?"
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Options ({draft.prono_options.length}/8)
          </span>
          {draft.prono_options.map((option, index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key -- options are plain strings; no stable id, only append/remove-by-index
              key={`prono-option-${index}`}
              className="flex items-center gap-2"
            >
              <AppInput
                required={draft.mode === 'prono' && index < 2}
                name="prono_options"
                value={option}
                onChange={(event) => {
                  const next = [...draft.prono_options];
                  next[index] = event.target.value;
                  setDraft((prev) => ({ ...prev, prono_options: next }));
                }}
                placeholder={`Option ${index + 1}`}
              />
              {draft.prono_options.length > 2 ? (
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft((prev) => ({
                      ...prev,
                      prono_options: prev.prono_options.filter(
                        (_, idx) => idx !== index,
                      ),
                    }));
                  }}
                >
                  Retirer
                </AppButton>
              ) : null}
            </div>
          ))}
        </div>

        {draft.prono_options.length < 8 ? (
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => {
              setDraft((prev) => ({
                ...prev,
                prono_options: [...prev.prono_options, ''],
              }));
            }}
          >
            Ajouter option
          </AppButton>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="prono_allow_multiple"
            value="true"
            checked={draft.prono_allow_multiple}
            onChange={(event) => {
              setDraft((prev) => ({
                ...prev,
                prono_allow_multiple: event.target.checked,
              }));
            }}
          />
          <span>
            Autoriser plusieurs réponses simultanées (chaque option pariée
            compte indépendamment).
          </span>
        </label>
      </section>
    </div>
  );

  return (
    <AppCard className="mx-auto w-full max-w-4xl space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Post Composer
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nouveau post
        </h1>
        <p className="text-sm text-muted-foreground">Brouillon: {draftState}</p>
      </header>
      {initialError ? (
        <AppBanner
          title="Publication impossible"
          body={initialError}
          tone="warning"
        />
      ) : null}

      <form
        action={async (fd) => {
          // Clear the saved draft BEFORE dispatching the server action.
          // Otherwise a successful publish leaves the draft in localStorage
          // and the composer reloads it next time /post/new is visited —
          // pre-filling a new post with the title / body of the poll we
          // just published, and vice-versa. (The action always redirects
          // on success so we never come back here to clean up.)
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(DRAFT_KEY);
          }
          // The composer hosts three independent flows; the prono request
          // takes a different RPC than `rpc_create_post_full`. Dispatch on
          // the active mode so the parent can pass either or both actions.
          if (fd.get('post_mode') === 'prono' && pronoAction) {
            await pronoAction(fd);
            return;
          }
          await action(fd);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="redirect_path" value={redirectPath} />
        <input type="hidden" name="post_mode" value={draft.mode} />
        <input type="hidden" name="body_format" value="markdown" />
        {draft.subject_ids.map((id) => (
          <input key={id} type="hidden" name="subject_ids" value={id} />
        ))}
        {draft.party_tags.map((slug) => (
          <input key={slug} type="hidden" name="party_tags" value={slug} />
        ))}

        <div className="grid gap-4 md:grid-cols-2">
          <label htmlFor="post-composer-title" className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Titre
            </span>
            <AppInput
              id="post-composer-title"
              name="title"
              required
              value={draft.title}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, title: event.target.value }));
              }}
              placeholder="Titre du post"
            />
          </label>

          <label htmlFor="post-composer-source-url" className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Lien source (optionnel)
            </span>
            <AppInput
              id="post-composer-source-url"
              name="source_url"
              value={draft.source_url}
              onChange={(event) => {
                setDraft((prev) => ({
                  ...prev,
                  source_url: event.target.value,
                }));
              }}
              placeholder="https://..."
            />
          </label>
        </div>

        {subjects.length > 0 ? (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Sujets
            </span>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => {
                const active = draft.subject_ids.includes(subject.id);
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => {
                      toggleSubject(subject.id);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground hover:bg-muted/70',
                    )}
                  >
                    {subject.emoji} {subject.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Partis mentionnés{' '}
            <span className="text-muted-foreground/60">(max 3)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {PARTY_OPTIONS.map((party) => {
              const active = draft.party_tags.includes(party.slug);
              const disabled = !active && draft.party_tags.length >= 3;
              return (
                <button
                  key={party.slug}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    toggleParty(party.slug);
                  }}
                  className={cn(
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-foreground hover:bg-muted/70',
                    disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {party.label}
                </button>
              );
            })}
          </div>
        </div>

        <AppTabs
          value={draft.mode}
          onValueChange={(mode) => {
            setDraft((prev) => ({ ...prev, mode: normalizeMode(mode) }));
          }}
          items={[
            { key: 'post', label: 'Post', content: postTab },
            { key: 'poll', label: 'Sondage', content: pollTab },
            ...(pronoAction
              ? [
                  {
                    key: 'prono',
                    label: 'Demande de prono',
                    content: pronoTab,
                  },
                ]
              : []),
          ]}
        />

        <footer className="flex flex-wrap items-center justify-end gap-2">
          <AppButton
            type="button"
            variant="ghost"
            onClick={() => {
              persistDraft(draft, 'manual');
            }}
          >
            Enregistrer le brouillon
          </AppButton>
          <AppButton variant="secondary" href={redirectPath}>
            Annuler
          </AppButton>
          <AppButton type="submit">
            {draft.mode === 'prono'
              ? 'Soumettre la demande'
              : 'Publier le post'}
          </AppButton>
        </footer>
      </form>
    </AppCard>
  );
}

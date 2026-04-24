'use client';

import { useState } from 'react';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { AppInput } from '@/components/app/app-input';

export interface PollEditFormProps {
  action: (formData: FormData) => Promise<void>;
  postItemId: string;
  slug: string;
  initialQuestion: string;
  initialOptions: string[];
  cancelHref: string;
}

interface OptionField {
  key: string;
  label: string;
}

function buildInitialOptions(labels: string[]): OptionField[] {
  return labels.map((label, i) => ({ key: `opt-${i}`, label }));
}

export function PollEditForm({
  action,
  postItemId,
  slug,
  initialQuestion,
  initialOptions,
  cancelHref,
}: PollEditFormProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [options, setOptions] = useState<OptionField[]>(() =>
    buildInitialOptions(initialOptions),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await action(formData);
    } catch (caught) {
      if (
        caught instanceof Error &&
        (caught.message === 'NEXT_REDIRECT' ||
          (caught as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))
      ) {
        throw caught;
      }
      // Next 16 masks server-action error messages in production for security
      // ("An error occurred in the Server Components render..."). Detect that
      // and fall back to a domain-specific message instead of leaking the
      // framework's generic text to the user.
      const rawMessage =
        caught instanceof Error ? caught.message : 'Modification impossible.';
      const isMasked = /Server Components render/i.test(rawMessage);
      setError(
        isMasked
          ? 'Sondage verrouillé (votes déjà enregistrés) ou modification invalide.'
          : rawMessage,
      );
      setPending(false);
    }
  }

  function setOptionAt(index: number, value: string) {
    setOptions((prev) =>
      prev.map((v, i) => (i === index ? { ...v, label: value } : v)),
    );
  }

  const canSubmit =
    !pending &&
    question.trim().length > 0 &&
    options.every((o) => o.label.trim());

  return (
    <AppCard className="space-y-4 p-4">
      <h1 className="text-lg font-semibold text-foreground">
        Modifier le sondage
      </h1>

      <form action={onSubmit} className="space-y-3">
        <input type="hidden" name="post_item_id" value={postItemId} />
        <input type="hidden" name="slug" value={slug} />

        <div className="space-y-1">
          <label
            htmlFor="poll-edit-question"
            className="text-sm font-medium text-foreground"
          >
            Question
          </label>
          <AppInput
            id="poll-edit-question"
            name="poll_question"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
            }}
            required
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Options</p>
          {options.map((opt, i) => (
            <AppInput
              key={opt.key}
              name="poll_options"
              value={opt.label}
              onChange={(e) => {
                setOptionAt(i, e.target.value);
              }}
              required
              maxLength={120}
            />
          ))}
          <p className="text-xs text-muted-foreground">
            Le nombre d&apos;options est figé. Renommez-les ici avant qu&apos;un
            vote ne soit enregistré.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <AppButton variant="ghost" href={cancelHref}>
            Annuler
          </AppButton>
          <AppButton type="submit" disabled={!canSubmit}>
            {pending ? 'Enregistrement...' : 'Enregistrer'}
          </AppButton>
        </div>
      </form>
    </AppCard>
  );
}

'use client';

import { useState } from 'react';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { AppInput } from '@/components/app/app-input';
import { AppTextarea } from '@/components/app/app-textarea';

export interface PostEditFormProps {
  action: (formData: FormData) => Promise<void>;
  postItemId: string;
  slug: string;
  initialTitle: string;
  initialBody: string;
  cancelHref: string;
}

export function PostEditForm({
  action,
  postItemId,
  slug,
  initialTitle,
  initialBody,
  cancelHref,
}: PostEditFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
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
      setError(
        caught instanceof Error ? caught.message : 'Modification impossible.',
      );
      setPending(false);
    }
  }

  return (
    <AppCard className="space-y-4 p-4">
      <h1 className="text-lg font-semibold text-foreground">
        Modifier le post
      </h1>

      <form action={onSubmit} className="space-y-3">
        <input type="hidden" name="post_item_id" value={postItemId} />
        <input type="hidden" name="slug" value={slug} />

        <div className="space-y-1">
          <label
            htmlFor="post-edit-title"
            className="text-sm font-medium text-foreground"
          >
            Titre
          </label>
          <AppInput
            id="post-edit-title"
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            required
            maxLength={200}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="post-edit-body"
            className="text-sm font-medium text-foreground"
          >
            Contenu
          </label>
          <AppTextarea
            id="post-edit-body"
            name="body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
            }}
            rows={10}
            maxLength={10_000}
          />
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
          <AppButton type="submit" disabled={pending || !title.trim()}>
            {pending ? 'Enregistrement...' : 'Enregistrer'}
          </AppButton>
        </div>
      </form>
    </AppCard>
  );
}

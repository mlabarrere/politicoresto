'use client';

import { CommentComposerShell } from '@/components/forms/comment-composer-shell';
import type { EditComposerProps } from '@/lib/types/forum-components';

export function EditComposer({
  commentId,
  initialValue,
  onSubmit,
  onCancel,
}: EditComposerProps) {
  return (
    <CommentComposerShell
      initialValue={initialValue}
      submitLabel="Enregistrer"
      submittingLabel="Enregistrement..."
      submitErrorLabel="Echec de mise a jour."
      onCancel={onCancel}
      testId="edit-composer"
      onSubmit={async (body) => {
        await onSubmit({ commentId, body });
      }}
    />
  );
}

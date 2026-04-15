"use client";

import { CommentComposerShell } from "@/components/forms/comment-composer-shell";
import type { ReplyComposerProps } from "@/lib/types/forum-components";

export function ReplyComposer({
  targetType,
  targetId,
  parentCommentId,
  initialValue = "",
  mentionPrefix,
  autoFocus,
  onSubmit,
  onCancel
}: ReplyComposerProps) {
  const initialBody = `${mentionPrefix ?? ""}${initialValue}`.trimStart();

  return (
    <CommentComposerShell
      initialValue={initialBody}
      placeholder="Votre réponse"
      submitLabel="Publier"
      submittingLabel="Publication..."
      submitErrorLabel="Echec d'enregistrement."
      onCancel={onCancel}
      autoFocus={autoFocus}
      testId="reply-composer"
      onSubmit={async (body) => {
        await onSubmit({
          targetType,
          targetId,
          parentCommentId,
          body
        });
      }}
    />
  );
}



"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
  const [body, setBody] = useState(`${mentionPrefix ?? ""}${initialValue}`.trimStart());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!body.trim()) {
      setError("Contenu requis.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        targetType,
        targetId,
        parentCommentId,
        body: body.trim()
      });
    } catch {
      setError("Echec enregistrement.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-background/80 p-3" data-testid="reply-composer">
      <textarea
        autoFocus={autoFocus}
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Votre reponse"
        className="w-full resize-y rounded-xl border border-border px-3 py-2 text-sm"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" size="sm" disabled={isSubmitting} onClick={() => void handleSubmit()}>
          {isSubmitting ? "Publication..." : "Publier"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { EditComposerProps } from "@/lib/types/forum-components";

export function EditComposer({ commentId, initialValue, onSubmit, onCancel }: EditComposerProps) {
  const [body, setBody] = useState(initialValue);
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
      await onSubmit({ commentId, body: body.trim() });
    } catch {
      setError("Echec mise a jour.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-background/80 p-3" data-testid="edit-composer">
      <textarea
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="w-full resize-y rounded-xl border border-border px-3 py-2 text-sm"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" size="sm" disabled={isSubmitting} onClick={() => void handleSubmit()}>
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

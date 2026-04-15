"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentComposerShell({
  initialValue,
  placeholder,
  submitLabel,
  submittingLabel,
  submitErrorLabel,
  onSubmit,
  onCancel,
  autoFocus,
  testId
}: {
  initialValue: string;
  placeholder?: string;
  submitLabel: string;
  submittingLabel: string;
  submitErrorLabel: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
  testId: string;
}) {
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
      await onSubmit(body.trim());
    } catch {
      setError(submitErrorLabel);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-background/80 p-3" data-testid={testId}>
      <Textarea
        autoFocus={autoFocus}
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        className="resize-y"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" size="sm" disabled={isSubmitting} onClick={() => void handleSubmit()}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}

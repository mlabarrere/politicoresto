"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { PollConfidenceCard } from "@/components/poll/poll-confidence-card";
import { PollProfilePrompt } from "@/components/poll/poll-profile-prompt";
import { PollResults } from "@/components/poll/poll-results";
import { PollStatusBadge } from "@/components/poll/poll-status-badge";
import type { PollCardInlineProps } from "@/lib/types/polls";
import type { PostPollSummaryView } from "@/lib/types/views";

type VoteResponse = {
  poll: PostPollSummaryView;
};

export function PollCardInline({ poll, isAuthenticated, onVoted }: PollCardInlineProps) {
  const [model, setModel] = useState<PostPollSummaryView>(poll);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isClosed = model.poll_status === "closed";
  const hasAnswered = Boolean(model.selected_option_id);

  const helperText = useMemo(() => {
    if (isClosed) return "Sondage clos.";
    if (hasAnswered) return "Sondage en cours. Les resultats peuvent encore bouger.";
    return "Panel volontaire, non probabiliste.";
  }, [hasAnswered, isClosed]);

  async function submitVote(optionId: string) {
    if (!isAuthenticated || isClosed || pending) return;
    setPending(optionId);
    setError(null);
    try {
      const response = await fetch("/api/polls/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          postItemId: model.post_item_id,
          optionId
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Vote impossible");
      }

      const payload = (await response.json()) as VoteResponse;
      setModel(payload.poll);
      onVoted?.(payload.poll);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Vote impossible");
    } finally {
      setPending(null);
    }
  }

  return (
    <AppCard className="space-y-3 border-dashed p-3" aria-label="Bloc sondage">
      <header className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Sondage</p>
        <PollStatusBadge status={model.poll_status} />
      </header>

      <p className="text-sm text-foreground">{model.question}</p>

      {!hasAnswered && !isClosed ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {model.options.map((option) => (
            <AppButton
              key={option.option_id}
              type="button"
              variant="secondary"
              className="justify-start"
              disabled={!isAuthenticated || Boolean(pending)}
              onClick={() => submitVote(option.option_id)}
            >
              {pending === option.option_id ? "Vote..." : option.label}
            </AppButton>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resultat brut
            </p>
            <PollResults poll={model} mode="raw" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estimation corrigee
            </p>
            <PollResults poll={model} mode="corrected" />
          </div>
          <PollConfidenceCard poll={model} />
          <PollProfilePrompt />
        </div>
      )}

      <p className="text-xs text-muted-foreground">{helperText}</p>

      {!isAuthenticated ? (
        <p className="text-xs text-muted-foreground">
          <Link href="/auth/login" className="font-medium text-foreground hover:underline">
            Connectez-vous
          </Link>{" "}
          pour voter.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </AppCard>
  );
}

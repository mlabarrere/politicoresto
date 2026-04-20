"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Check, Loader2, Slash, Trash2, X } from "lucide-react";

import { AppBanner } from "@/components/app/app-banner";
import { AppCard } from "@/components/app/app-card";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { deleteVoteHistoryAction, upsertVoteHistoryAction } from "@/lib/actions/vote-history";
import type {
  ElectionResultRow,
  ElectionRow,
  UserVoteRow
} from "@/lib/data/authenticated/vote-history";
import { getPartyTheme, initials } from "@/lib/ui/party-colors";
import { cn } from "@/lib/utils";

type ChoiceKind = UserVoteRow["choice_kind"];

type AbstentionOption = {
  kind: Exclude<ChoiceKind, "vote">;
  label: string;
  short: string;
  bg: string;
  fg: string;
};

const ABSTENTION_OPTIONS: AbstentionOption[] = [
  { kind: "blanc",              label: "Vote blanc",          short: "Blanc",   bg: "#e5e7eb", fg: "#111827" },
  { kind: "nul",                label: "Vote nul",            short: "Nul",     bg: "#cbd5e1", fg: "#111827" },
  { kind: "abstention",         label: "Abstention",          short: "Abst.",   bg: "#94a3b8", fg: "#0b0b0b" },
  { kind: "non_inscrit",        label: "Non inscrit(e)",      short: "N.insc.", bg: "#64748b", fg: "#ffffff" },
  { kind: "ne_se_prononce_pas", label: "Ne se prononce pas",  short: "N.S.P.",  bg: "#475569", fg: "#ffffff" }
];

type EditorStatus = "ready" | "unavailable" | "error";

type ElectionGroup = {
  key: string;
  type: ElectionRow["type"];
  year: number;
  elections: ElectionRow[];
};

type VoteMap = Record<string, UserVoteRow>;

type VoteMutation =
  | { kind: "set"; election: ElectionRow; resultId: string | null; choiceKind: ChoiceKind }
  | { kind: "clear"; electionId: string };

function applyMutation(current: VoteMap, mut: VoteMutation): VoteMap {
  if (mut.kind === "clear") {
    if (!(mut.electionId in current)) return current;
    const next = { ...current };
    delete next[mut.electionId];
    return next;
  }
  const { election, resultId, choiceKind } = mut;
  const existing = current[election.id];
  const result =
    choiceKind === "vote" && resultId
      ? election.results.find((r) => r.id === resultId)
      : undefined;
  const next: UserVoteRow = {
    id: existing?.id ?? `optimistic:${election.id}`,
    election_id: election.id,
    election_slug: election.slug,
    election_label: election.label,
    election_result_id: choiceKind === "vote" ? resultId : null,
    choice_kind: choiceKind,
    confidence: existing?.confidence ?? null,
    notes: existing?.notes ?? null,
    declared_at: new Date().toISOString(),
    candidate_name: result?.candidate_name ?? null,
    list_label: result?.list_label ?? null,
    party_slug: result?.party_slug ?? null
  };
  return { ...current, [election.id]: next };
}

function groupElections(elections: ElectionRow[]): ElectionGroup[] {
  const groups = new Map<string, ElectionRow[]>();
  for (const e of elections) {
    const key = `${e.type}-${e.year}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  const out: ElectionGroup[] = [];
  for (const [key, list] of groups.entries()) {
    const first = list[0];
    if (!first) continue;
    out.push({ key, type: first.type, year: first.year, elections: list });
  }
  return out;
}

export function AppVoteHistoryEditor({
  elections,
  votesByElectionId,
  status = "ready",
  message = null
}: {
  elections: ElectionRow[];
  votesByElectionId: Record<string, UserVoteRow>;
  status?: EditorStatus;
  message?: string | null;
}) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // useOptimistic ouvre un "miroir" du state serveur qu'on peut bumper instantanement
  // pour donner du feedback utilisateur (couleur du parti, check) sans attendre le
  // round-trip Supabase + revalidatePath.
  const [optimisticVotes, applyOptimistic] = useOptimistic<VoteMap, VoteMutation>(
    votesByElectionId,
    applyMutation
  );

  const grouped = useMemo(() => groupElections(elections), [elections]);

  if (status === "unavailable") {
    return <AppEmptyState title="Historique electoral indisponible" body={message ?? "Cette section sera active bientot sur cet environnement."} />;
  }
  if (status === "error") {
    return <AppEmptyState title="Historique indisponible" body={message ?? "Reessayez dans quelques instants."} />;
  }
  if (!elections.length) {
    return <AppEmptyState title="Aucun scrutin seede" body="L'historique des scrutins n'a pas ete charge." />;
  }

  function runAction(key: string, mutation: VoteMutation, fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      setPendingKey(key);
      // Optimistic first — l'UI reflete le choix instantanement.
      applyOptimistic(mutation);
      try {
        await fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Action impossible.";
        console.error("[vote-history][editor] action failed", { message: msg });
        setError(msg);
      } finally {
        setPendingKey(null);
      }
    });
  }

  function handleResultClick(election: ElectionRow, resultId: string) {
    const key = `${election.slug}:${resultId}`;
    const current = optimisticVotes[election.id];
    const alreadySelected =
      current?.choice_kind === "vote" && current.election_result_id === resultId;

    if (alreadySelected) {
      runAction(key, { kind: "clear", electionId: election.id }, () =>
        deleteVoteHistoryAction(election.slug)
      );
      return;
    }

    runAction(
      key,
      { kind: "set", election, resultId, choiceKind: "vote" },
      () =>
        upsertVoteHistoryAction({
          election_slug: election.slug,
          election_result_id: resultId,
          choice_kind: "vote",
          confidence: null,
          notes: null
        })
    );
  }

  function handleAbstentionClick(election: ElectionRow, kind: Exclude<ChoiceKind, "vote">) {
    const key = `${election.slug}:${kind}`;
    const current = optimisticVotes[election.id];
    const alreadySelected = current?.choice_kind === kind;

    if (alreadySelected) {
      runAction(key, { kind: "clear", electionId: election.id }, () =>
        deleteVoteHistoryAction(election.slug)
      );
      return;
    }

    runAction(
      key,
      { kind: "set", election, resultId: null, choiceKind: kind },
      () =>
        upsertVoteHistoryAction({
          election_slug: election.slug,
          election_result_id: null,
          choice_kind: kind,
          confidence: null,
          notes: null
        })
    );
  }

  function handleClear(election: ElectionRow) {
    runAction(
      `${election.slug}:clear`,
      { kind: "clear", electionId: election.id },
      () => deleteVoteHistoryAction(election.slug)
    );
  }

  return (
    <div className="space-y-4">
      {error ? <AppBanner title="Enregistrement impossible" body={error} tone="warning" /> : null}

      {grouped.map((group) => (
        <AppCard key={group.key} className="space-y-3 p-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                {formatElectionTypeLabel(group.type)} {group.year}
              </h3>
              <p className="text-xs text-muted-foreground">
                Cliquez une case pour declarer votre vote. Re-cliquez pour l&apos;effacer.
              </p>
            </div>
          </header>

          {group.elections.map((election) => (
            <ElectionRowBlock
              key={election.id}
              election={election}
              currentVote={optimisticVotes[election.id]}
              isPending={isPending}
              pendingKey={pendingKey}
              onResultClick={handleResultClick}
              onAbstentionClick={handleAbstentionClick}
              onClear={handleClear}
            />
          ))}
        </AppCard>
      ))}
    </div>
  );
}

function ElectionRowBlock({
  election,
  currentVote,
  isPending,
  pendingKey,
  onResultClick,
  onAbstentionClick,
  onClear
}: {
  election: ElectionRow;
  currentVote: UserVoteRow | undefined;
  isPending: boolean;
  pendingKey: string | null;
  onResultClick: (election: ElectionRow, resultId: string) => void;
  onAbstentionClick: (election: ElectionRow, kind: Exclude<ChoiceKind, "vote">) => void;
  onClear: (election: ElectionRow) => void;
}) {
  const pendingForThis = isPending && pendingKey?.startsWith(`${election.slug}:`);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {election.round ? `Tour ${election.round} — ` : ""}
          {formatHeldOn(election.held_on)}
        </p>
        {currentVote ? (
          <button
            type="button"
            onClick={() => {
              onClear(election);
            }}
            disabled={pendingForThis}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            Effacer mon vote
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
        {election.results.map((result) => (
          <CandidateTile
            key={result.id}
            election={election}
            result={result}
            isSelected={
              currentVote?.choice_kind === "vote" &&
              currentVote.election_result_id === result.id
            }
            isPending={isPending}
            isLoading={isPending && pendingKey === `${election.slug}:${result.id}`}
            onClick={onResultClick}
          />
        ))}

        {ABSTENTION_OPTIONS.map((opt) => (
          <AbstentionTile
            key={opt.kind}
            election={election}
            option={opt}
            isSelected={currentVote?.choice_kind === opt.kind}
            isPending={isPending}
            isLoading={isPending && pendingKey === `${election.slug}:${opt.kind}`}
            onClick={onAbstentionClick}
          />
        ))}
      </div>
    </div>
  );
}

function CandidateTile({
  election,
  result,
  isSelected,
  isPending,
  isLoading,
  onClick
}: {
  election: ElectionRow;
  result: ElectionResultRow;
  isSelected: boolean;
  isPending: boolean;
  isLoading: boolean;
  onClick: (election: ElectionRow, resultId: string) => void;
}) {
  const theme = getPartyTheme(result.party_slug);
  const displayName = result.candidate_name ?? result.list_label ?? "Candidat";
  const tooltipBase = result.candidate_name
    ? `${result.candidate_name}${result.list_label ? ` — ${result.list_label}` : ""}`
    : result.list_label ?? "Candidat";
  const pctLabel =
    result.pct_exprimes != null
      ? ` (${result.pct_exprimes.toFixed(2).replace(".", ",")}%)`
      : "";

  return (
    <button
      type="button"
      onClick={() => {
        onClick(election, result.id);
      }}
      disabled={isLoading}
      aria-pressed={isSelected}
      aria-label={`${tooltipBase} — ${isSelected ? "selectionne" : "non selectionne"}`}
      title={`${tooltipBase}${pctLabel}`}
      style={
        isSelected
          ? { backgroundColor: theme.bg, color: theme.fg, boxShadow: `0 0 0 2px ${theme.ring}` }
          : undefined
      }
      className={cn(
        "group relative flex h-20 flex-col items-center justify-center rounded-xl border p-1 text-center text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "border-transparent"
          : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted",
        isLoading && "cursor-wait opacity-80"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
          isSelected ? "bg-black/15" : "bg-muted"
        )}
        style={
          !isSelected && result.party_slug
            ? { backgroundColor: `${theme.bg}22`, color: theme.ring }
            : undefined
        }
      >
        {initials(displayName)}
      </span>
      <span className="mt-1 line-clamp-2 w-full px-0.5 text-[10px] leading-tight">
        {shortName(displayName)}
      </span>
      {isSelected ? (
        <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white">
          <Check className="h-2.5 w-2.5" aria-hidden />
        </span>
      ) : null}
      {isLoading ? (
        <span className="absolute left-1 top-1 inline-flex h-3.5 w-3.5 items-center justify-center">
          <Loader2 className="h-3 w-3 animate-spin opacity-70" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function AbstentionTile({
  election,
  option,
  isSelected,
  isPending,
  isLoading,
  onClick
}: {
  election: ElectionRow;
  option: AbstentionOption;
  isSelected: boolean;
  isPending: boolean;
  isLoading: boolean;
  onClick: (election: ElectionRow, kind: Exclude<ChoiceKind, "vote">) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick(election, option.kind);
      }}
      disabled={isLoading}
      aria-pressed={isSelected}
      aria-label={`${option.label} — ${isSelected ? "selectionne" : "non selectionne"}`}
      title={option.label}
      style={isSelected ? { backgroundColor: option.bg, color: option.fg } : undefined}
      className={cn(
        "group relative flex h-20 flex-col items-center justify-center rounded-xl border border-dashed p-1 text-center text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "border-transparent"
          : "border-border bg-muted/40 text-muted-foreground hover:border-foreground/30 hover:bg-muted",
        isLoading && "cursor-wait opacity-80"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
          isSelected ? "bg-black/10" : "bg-muted"
        )}
      >
        {option.kind === "blanc" ? (
          <X className="h-3.5 w-3.5" aria-hidden />
        ) : option.kind === "nul" ? (
          <Slash className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <span>—</span>
        )}
      </span>
      <span className="mt-1 text-[10px] leading-tight">{option.short}</span>
      {isSelected ? (
        <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white">
          <Check className="h-2.5 w-2.5" aria-hidden />
        </span>
      ) : null}
      {isLoading ? (
        <span className="absolute left-1 top-1 inline-flex h-3.5 w-3.5 items-center justify-center">
          <Loader2 className="h-3 w-3 animate-spin opacity-70" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function formatElectionTypeLabel(type: ElectionRow["type"]): string {
  switch (type) {
    case "presidentielle":
      return "Presidentielle";
    case "legislatives":
      return "Legislatives";
    case "europeennes":
      return "Europeennes";
    default:
      return type;
  }
}

function formatHeldOn(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return full;
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first || !last) return full;
  const firstLetter = first.charAt(0);
  return firstLetter ? `${firstLetter}. ${last}` : last;
}

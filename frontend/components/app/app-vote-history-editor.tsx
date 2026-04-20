"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Slash, Trash2, X } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Action impossible.";
        console.error("[vote-history][editor] action failed", { message: msg });
        setError(msg);
      }
    });
  }

  function onResultClick(election: ElectionRow, resultId: string) {
    const current = votesByElectionId[election.id];
    const alreadySelected =
      current?.choice_kind === "vote" && current.election_result_id === resultId;
    run(() =>
      alreadySelected
        ? deleteVoteHistoryAction(election.slug)
        : upsertVoteHistoryAction({
            election_slug: election.slug,
            election_result_id: resultId,
            choice_kind: "vote"
          })
    );
  }

  function onAbstentionClick(election: ElectionRow, kind: Exclude<ChoiceKind, "vote">) {
    const current = votesByElectionId[election.id];
    const alreadySelected = current?.choice_kind === kind;
    run(() =>
      alreadySelected
        ? deleteVoteHistoryAction(election.slug)
        : upsertVoteHistoryAction({
            election_slug: election.slug,
            election_result_id: null,
            choice_kind: kind
          })
    );
  }

  return (
    <div className={cn("space-y-4", isPending && "opacity-80")}>
      {error ? <AppBanner title="Enregistrement impossible" body={error} tone="warning" /> : null}

      {grouped.map((group) => (
        <AppCard key={group.key} className="space-y-3 p-4">
          <header>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              {formatElectionTypeLabel(group.type)} {group.year}
            </h3>
            <p className="text-xs text-muted-foreground">
              Cliquez une case pour declarer votre vote. Re-cliquez pour l&apos;effacer.
            </p>
          </header>

          {group.elections.map((election) => (
            <ElectionRowBlock
              key={election.id}
              election={election}
              currentVote={votesByElectionId[election.id]}
              onResultClick={onResultClick}
              onAbstentionClick={onAbstentionClick}
              onClear={(e) => run(() => deleteVoteHistoryAction(e.slug))}
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
  onResultClick,
  onAbstentionClick,
  onClear
}: {
  election: ElectionRow;
  currentVote: UserVoteRow | undefined;
  onResultClick: (election: ElectionRow, resultId: string) => void;
  onAbstentionClick: (election: ElectionRow, kind: Exclude<ChoiceKind, "vote">) => void;
  onClear: (election: ElectionRow) => void;
}) {
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
            onClick={() => onClear(election)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
            result={result}
            isSelected={
              currentVote?.choice_kind === "vote" &&
              currentVote.election_result_id === result.id
            }
            onClick={() => onResultClick(election, result.id)}
          />
        ))}

        {ABSTENTION_OPTIONS.map((opt) => (
          <AbstentionTile
            key={opt.kind}
            option={opt}
            isSelected={currentVote?.choice_kind === opt.kind}
            onClick={() => onAbstentionClick(election, opt.kind)}
          />
        ))}
      </div>
    </div>
  );
}

function CandidateTile({
  result,
  isSelected,
  onClick
}: {
  result: ElectionResultRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  const theme = getPartyTheme(result.party_slug);
  // Tile label = nom court pour candidat ("E. Macron"), liste telle quelle.
  // Les list_label en base sont deja concis apres migration 20260420220000.
  const tileLabel = result.candidate_name
    ? shortenCandidateName(result.candidate_name)
    : result.list_label ?? "Liste";
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
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${tooltipBase} — ${isSelected ? "selectionne" : "non selectionne"}`}
      title={`${tooltipBase}${pctLabel}`}
      style={
        isSelected
          ? { backgroundColor: theme.bg, color: theme.fg, boxShadow: `0 0 0 2px ${theme.ring}` }
          : undefined
      }
      className={cn(
        "relative flex h-20 flex-col items-center justify-center rounded-xl border p-1 text-center text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "border-transparent"
          : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted"
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
        {tileLabel}
      </span>
      {isSelected ? (
        <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white">
          <Check className="h-2.5 w-2.5" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function AbstentionTile({
  option,
  isSelected,
  onClick
}: {
  option: AbstentionOption;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${option.label} — ${isSelected ? "selectionne" : "non selectionne"}`}
      title={option.label}
      style={isSelected ? { backgroundColor: option.bg, color: option.fg } : undefined}
      className={cn(
        "relative flex h-20 flex-col items-center justify-center rounded-xl border border-dashed p-1 text-center text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "border-transparent"
          : "border-border bg-muted/40 text-muted-foreground hover:border-foreground/30 hover:bg-muted"
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
    </button>
  );
}

function formatElectionTypeLabel(type: ElectionRow["type"]): string {
  switch (type) {
    case "presidentielle": return "Presidentielle";
    case "legislatives":   return "Legislatives";
    case "europeennes":    return "Europeennes";
    default:               return type;
  }
}

function formatHeldOn(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

// Transforme "Emmanuel Macron" en "E. Macron". S'applique UNIQUEMENT aux noms
// de candidats (prenom + nom, parfois compose). Pour 3+ mots on tronque juste
// le prenom pour laisser la place au nom de famille complet.
function shortenCandidateName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return full;
  const [first, ...rest] = parts;
  if (!first) return full;
  return `${first.charAt(0)}. ${rest.join(" ")}`;
}

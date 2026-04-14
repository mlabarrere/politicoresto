export type VoteHistoryScopeKind = "presidential" | "legislative" | "european";
export type VoteParticipationStatus = "voted" | "abstained" | "blank_null" | "prefer_not_to_say";

export type VoteHistoryScopeGroup = {
  kind: VoteHistoryScopeKind;
  label: string;
  years: number[];
};

export type VoteHistoryContext = {
  election_scope_kind: VoteHistoryScopeKind;
  election_scope_year: number;
  election_scope_key: string;
  election_scope_label: string;
};

export const VOTE_PARTICIPATION_OPTIONS: Array<{
  value: VoteParticipationStatus;
  label: string;
}> = [
  { value: "voted", label: "J'ai vote" },
  { value: "abstained", label: "Abstention" },
  { value: "blank_null", label: "Vote blanc ou nul" },
  { value: "prefer_not_to_say", label: "Je prefere ne pas le dire" }
];

// Scope verified against official French public election chronology pages.
// Sources:
// - https://www.interieur.gouv.fr/actualites/actualites-du-ministere/elections-legislatives-2024
// - https://www.vie-publique.fr/eclairage/272087-election-presidentielle-2022-les-resultats
// - https://www.vie-publique.fr/eclairage/286643-elections-europeennes-2024-les-resultats

export const VOTE_HISTORY_SCOPE_GROUPS: VoteHistoryScopeGroup[] = [
  { kind: "presidential", label: "Presidentielle", years: [2007, 2012, 2017, 2022] },
  { kind: "legislative", label: "Legislatives", years: [2007, 2012, 2017, 2022, 2024] },
  { kind: "european", label: "Europeennes", years: [2009, 2014, 2019, 2024] }
];

const GROUP_BY_KIND = new Map(VOTE_HISTORY_SCOPE_GROUPS.map((group) => [group.kind, group]));

export function resolveVoteHistoryScopeKey(rawKey: string): VoteHistoryContext | null {
  const [kindRaw, yearRaw] = rawKey.split(":");
  const year = Number(yearRaw);

  if (!kindRaw || !Number.isInteger(year)) {
    return null;
  }

  const kind = kindRaw as VoteHistoryScopeKind;
  const group = GROUP_BY_KIND.get(kind);

  if (!group || !group.years.includes(year)) {
    return null;
  }

  return {
    election_scope_kind: kind,
    election_scope_year: year,
    election_scope_key: `${kind}:${year}`,
    election_scope_label: `${group.label} ${year}`
  };
}

export function formatVoteHistoryScopeLabel(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const context = value as Record<string, unknown>;
  const kind = typeof context.election_scope_kind === "string" ? context.election_scope_kind : "";
  const year = typeof context.election_scope_year === "number" ? context.election_scope_year : null;

  if (!kind || year === null) {
    return null;
  }

  const group = GROUP_BY_KIND.get(kind as VoteHistoryScopeKind);
  if (!group || !group.years.includes(year)) {
    return null;
  }

  return `${group.label} ${year}`;
}

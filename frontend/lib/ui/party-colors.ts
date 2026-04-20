// Couleurs par slug de parti, alignees aux chartes officielles ou usages mediatiques.
// Sert a peindre les cases candidat dans l'editeur d'historique de vote (/me?section=votes).
// bg = fond plein ; fg = texte/contraste ; ring = bordure focus.

export type PartyTheme = {
  bg: string;
  fg: string;
  ring: string;
};

const PARTY_THEME: Record<string, PartyTheme> = {
  renaissance:       { bg: "#ffd400", fg: "#0b0b0b", ring: "#a38a00" },
  rn:                { bg: "#0d378a", fg: "#ffffff", ring: "#061d4d" },
  lfi:               { bg: "#cc2443", fg: "#ffffff", ring: "#7c1127" },
  lr:                { bg: "#0066cc", fg: "#ffffff", ring: "#003f80" },
  ps:                { bg: "#ff8080", fg: "#1b0000", ring: "#b33b3b" },
  ecologistes:       { bg: "#2f9e44", fg: "#ffffff", ring: "#1b6a2a" },
  reconquete:        { bg: "#1f3864", fg: "#ffffff", ring: "#0f1c33" },
  modem:             { bg: "#ff6f00", fg: "#0b0b0b", ring: "#a14400" },
  horizons:          { bg: "#1e4d8c", fg: "#ffffff", ring: "#0e2a50" },
  pcf:               { bg: "#b8002e", fg: "#ffffff", ring: "#6e001c" },
  udi:               { bg: "#00a1e0", fg: "#ffffff", ring: "#005b80" },
  dlf:               { bg: "#122870", fg: "#ffffff", ring: "#081542" },
  resistons:         { bg: "#8d6e63", fg: "#ffffff", ring: "#4e3a34" },
  "place-publique":  { bg: "#e91e63", fg: "#ffffff", ring: "#880e4f" },
  generations:       { bg: "#ff4081", fg: "#ffffff", ring: "#9a1d4c" },
  "parti-animaliste":{ bg: "#4e342e", fg: "#ffffff", ring: "#2a1a17" },
  upr:               { bg: "#003366", fg: "#ffffff", ring: "#001a33" },
  "npa-anticapitaliste": { bg: "#e53935", fg: "#ffffff", ring: "#8b1a18" },
  "npa-revolutionnaires": { bg: "#c62828", fg: "#ffffff", ring: "#7a1616" },
  "lutte-ouvriere":  { bg: "#a30000", fg: "#ffffff", ring: "#5a0000" },
  udr:               { bg: "#1b3a8f", fg: "#ffffff", ring: "#0d1e4a" }
};

const FALLBACK: PartyTheme = { bg: "#94a3b8", fg: "#0b0b0b", ring: "#475569" };

export function getPartyTheme(slug: string | null | undefined): PartyTheme {
  if (!slug) return FALLBACK;
  return PARTY_THEME[slug] ?? FALLBACK;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

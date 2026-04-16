export const ACCOUNT_SECTIONS = [
  { key: "profile", label: "Profil", description: "Identite publique et informations privees" },
  { key: "votes", label: "Historique de vote", description: "Journal prive personnel" },
  { key: "drafts", label: "Brouillons", description: "Contenus non publies" },
  { key: "posts", label: "Publications", description: "Posts publies" },
  { key: "comments", label: "Commentaires", description: "Historique de vos interventions" },
  { key: "security", label: "Compte & securite", description: "Connexion et actions sensibles" }
] as const;

export type AccountSectionKey = (typeof ACCOUNT_SECTIONS)[number]["key"];

export function resolveAccountSection(section: string | null | undefined): AccountSectionKey {
  const fallback: AccountSectionKey = "profile";
  if (!section) return fallback;
  return (ACCOUNT_SECTIONS.find((item) => item.key === section)?.key ?? fallback) as AccountSectionKey;
}

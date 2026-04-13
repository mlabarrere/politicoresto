export const siteConfig = {
  name: "Politicoresto",
  description:
    "Suivez la presidentielle via un feed de threads, de sondages, de paris et d'espaces partisans.",
  navigation: {
    primary: [
      { href: "/", label: "Accueil" },
      { href: "/spaces", label: "Espaces" },
      { href: "/threads", label: "Threads" },
      { href: "/leaderboard", label: "Classements" },
      { href: "/cards", label: "Cartes" }
    ],
    authenticated: [
      { href: "/me", label: "Vue d'ensemble" },
      { href: "/me/predictions", label: "Mes participations" },
      { href: "/me/cards", label: "Mes cartes" },
      { href: "/me/reputation", label: "Ma reputation" },
      { href: "/me/settings", label: "Parametres" }
    ]
  },
  editorialTabs: [
    "A la une",
    "Bloc central",
    "RN",
    "LFI",
    "LR",
    "Ecologistes",
    "Resultats"
  ]
} as const;

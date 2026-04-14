export const siteConfig = {
  name: "Politicoresto",
  description:
    "Suivez la presidentielle via un feed de threads, de sondages, de commentaires et de blocs politiques.",
  navigation: {
    primary: [
      { href: "/", label: "Feed" },
      { href: "/leaderboard", label: "Classements" }
    ],
    authenticated: [
      { href: "/me", label: "Vue d'ensemble", hint: "Mon profil" },
      { href: "/me/settings#socio", label: "Informations socio-professionnelles", hint: "Prive" },
      { href: "/me/settings#historique", label: "Historique electoral", hint: "National" },
      { href: "/me/settings#confidentialite", label: "Confidentialite et consentement", hint: "Sensible" },
      { href: "/me/reputation", label: "Reputation", hint: "Optionnel" }
    ]
  },
  editorialTabs: ["A la une", "Bloc central", "RN", "LFI", "LR", "Ecologistes", "Resultats"]
} as const;

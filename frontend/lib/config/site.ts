export const siteConfig = {
  name: "Politicoresto",
  description:
    "Suivez des sujets publics, des discussions lisibles, des resultats et des reperes locaux dans une interface claire.",
  navigation: {
    primary: [
      { href: "/", label: "Accueil" },
      { href: "/spaces", label: "Espaces" },
      { href: "/topics", label: "Sujets" },
      { href: "/territories", label: "Territoires" },
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
    "Local",
    "Institutions",
    "Judiciaire",
    "International",
    "Resolus"
  ]
} as const;

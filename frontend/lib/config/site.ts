export const siteConfig = {
  name: "Politicoresto",
  description:
    "Forum politique minimal: categories, threads, commentaires, profil.",
  navigation: {
    primary: [
      { href: "/", label: "Accueil" }
    ],
    authenticated: [
      { href: "/me", label: "Mon profil", hint: "Prive" },
      { href: "/me/settings", label: "Parametres", hint: "Prive" }
    ]
  },
  editorialTabs: ["A la une", "Categories", "Discussion"]
} as const;

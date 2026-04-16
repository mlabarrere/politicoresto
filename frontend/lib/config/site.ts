export const siteConfig = {
  name: "Politicoresto",
  description:
    "Forum politique minimal: categories, threads, commentaires, profil.",
  navigation: {
    primary: [
      { href: "/", label: "Accueil" }
    ],
    authenticated: [
      { href: "/me?section=profile", label: "Profil", hint: "Prive" },
      { href: "/me?section=security", label: "Compte & securite", hint: "Prive" }
    ]
  },
  editorialTabs: ["A la une", "Categories", "Discussion"]
} as const;

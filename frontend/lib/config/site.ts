export const siteConfig = {
  name: "PoliticoResto",
  description:
    "Forum public minimal: posts, commentaires et profil.",
  navigation: {
    primary: [
      { href: "/", label: "Accueil" }
    ],
    authenticated: [
      { href: "/me?section=profile", label: "Profil", hint: "Prive" },
      { href: "/me?section=security", label: "Compte & securite", hint: "Prive" }
    ]
  },
  editorialTabs: ["Populaires", "Recents"]
} as const;

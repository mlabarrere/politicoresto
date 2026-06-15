export const siteConfig = {
  name: 'PoliticoResto',
  description: 'Forum public minimal: posts, commentaires et profil.',
  navigation: {
    primary: [
      { href: '/', label: 'Accueil' },
      { href: '/n', label: 'Explorer' },
      { href: '/boussole', label: 'Boussole' },
    ],
  },
} as const;

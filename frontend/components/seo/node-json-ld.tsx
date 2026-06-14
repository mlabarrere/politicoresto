import type { PublicNode } from '@/lib/data/public/nodes';

/**
 * Données structurées schema.org (JSON-LD) pour une fiche de Nœud.
 * Cœur de la découvrabilité SEO + GEO/AEO (PRD AD-8) : le contenu est
 * server-rendered et citable par les moteurs et les agents LLM.
 */
const SCHEMA_TYPE: Record<string, string> = {
  party: 'Organization',
  candidate: 'Person',
  elu: 'Person',
  theme: 'Thing',
  territory: 'Place',
};

export function NodeJsonLd({ node }: { node: PublicNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE[node.node_type] ?? 'Thing',
    name: node.title,
    url: `/n/${node.slug}`,
    ...(node.description ? { description: node.description } : {}),
  };

  // Durcissement XSS : on échappe `<` (et donc tout `</script>`) avant injection.
  const json = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // JSON-LD requiert une injection brute ; le contenu est sérialisé depuis
      // des données serveur maîtrisées et `<` est échappé ci-dessus.
      // eslint-disable-next-line react/no-danger -- JSON-LD: pas d'alternative sûre au rendu enfant
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

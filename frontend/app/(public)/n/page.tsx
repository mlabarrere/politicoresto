import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { AppBadge } from '@/components/app/app-badge';
import { AppCard } from '@/components/app/app-card';
import { AppPageHeader } from '@/components/app/app-page-header';
import { PageContainer } from '@/components/layout/page-container';
import { listNodes, type PublicNode } from '@/lib/data/public/nodes';

export const metadata: Metadata = {
  title: 'Graphe politique',
  description:
    'Explorez les partis et candidats : débats, sondages et pronostics, acteur par acteur.',
};

const GROUPS: { type: string; label: string }[] = [
  { type: 'party', label: 'Partis' },
  { type: 'candidate', label: 'Candidats' },
  { type: 'territory', label: 'Territoires' },
  { type: 'theme', label: 'Thèmes' },
  { type: 'elu', label: 'Élus' },
];

export default async function NodesIndexPage() {
  const nodes = await listNodes();
  const byType = new Map<string, PublicNode[]>();
  for (const node of nodes) {
    const list = byType.get(node.node_type) ?? [];
    list.push(node);
    byType.set(node.node_type, list);
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-5xl space-y-6">
        <AppPageHeader
          eyebrow="Graphe politique"
          title="Explorer les acteurs"
          description="Chaque parti, candidat ou thème a son espace : débats, sondages et pronostics."
        />

        {GROUPS.filter((group) => byType.has(group.type)).map((group) => (
          <section key={group.type} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(byType.get(group.type) ?? []).map((node) => (
                <li key={node.id}>
                  <Link href={`/n/${node.slug}` as Route} className="block">
                    <AppCard
                      as="div"
                      className="flex items-center justify-between gap-2 transition-shadow hover:shadow-md"
                    >
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {node.title}
                      </span>
                      {node.verification === 'verified' ? (
                        <AppBadge label="Vérifié" tone="info" />
                      ) : null}
                    </AppCard>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageContainer>
  );
}

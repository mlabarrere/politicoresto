import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppBadge } from '@/components/app/app-badge';
import { AppCard } from '@/components/app/app-card';
import { AppPageHeader } from '@/components/app/app-page-header';
import { PageContainer } from '@/components/layout/page-container';
import { ScreenState } from '@/components/layout/screen-state';
import { NodeJsonLd } from '@/components/seo/node-json-ld';
import { getNodeBySlug } from '@/lib/data/public/nodes';

const NODE_TYPE_LABEL: Record<string, string> = {
  party: 'Parti',
  candidate: 'Candidat',
  elu: 'Élu',
  theme: 'Thème',
  territory: 'Territoire',
};

function isForbidden(error: unknown): boolean {
  const code = String((error as { code?: string }).code ?? '');
  const message = String((error as { message?: string }).message ?? '');
  return (
    code === '42501' || message.toLowerCase().includes('permission denied')
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const node = await getNodeBySlug(slug).catch(() => null);
  if (!node) return { title: 'Nœud introuvable' };

  const typeLabel = NODE_TYPE_LABEL[node.node_type] ?? 'Nœud';
  const description =
    node.description ??
    `${typeLabel} sur PoliticoResto — débats, sondages et pronostics.`;

  return {
    title: node.title,
    description,
    openGraph: { title: node.title, description, type: 'profile' },
  };
}

export default async function NodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let node;

  try {
    node = await getNodeBySlug(slug);
  } catch (error) {
    if (isForbidden(error)) {
      return (
        <PageContainer>
          <ScreenState
            title="Accès refusé"
            body="Ce contenu n'est pas accessible avec vos droits actuels."
          />
        </PageContainer>
      );
    }
    throw error;
  }

  if (!node) {
    notFound();
  }

  const typeLabel = NODE_TYPE_LABEL[node.node_type] ?? 'Nœud';

  return (
    <PageContainer>
      <NodeJsonLd node={node} />
      <div className="mx-auto max-w-4xl space-y-4">
        <AppPageHeader
          eyebrow={typeLabel}
          title={node.title}
          description={node.description ?? undefined}
          actions={
            <div className="flex flex-wrap gap-2">
              {node.verification === 'official' ? (
                <AppBadge label="Officiel" tone="accent" />
              ) : null}
              {node.verification === 'verified' ? (
                <AppBadge label="Vérifié" tone="info" />
              ) : null}
            </div>
          }
        />

        <AppCard className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Discussions</h2>
          <p className="text-sm text-muted-foreground">
            Les débats, sondages et pronostics rattachés à ce nœud apparaîtront
            ici.
          </p>
        </AppCard>
      </div>
    </PageContainer>
  );
}

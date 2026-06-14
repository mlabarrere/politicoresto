import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Nœud public du graphe politique (un `space` de nature `node`).
 * Lisible par tous (RLS : `kind = 'node'` => lecture publique).
 */
export interface PublicNode {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  node_type: string;
  verification: string;
}

export async function getNodeBySlug(slug: string): Promise<PublicNode | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('space')
    .select('id, slug, title, description, node_type, verification')
    .eq('slug', slug)
    .eq('kind', 'node')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: String(data.id),
    slug: String(data.slug),
    title: String(data.title),
    description: (data.description as string | null) ?? null,
    node_type: String(data.node_type),
    verification: String(data.verification),
  };
}

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

function toPublicNode(row: Record<string, unknown>): PublicNode {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    node_type: String(row.node_type),
    verification: String(row.verification),
  };
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

  return toPublicNode(data);
}

/** Tous les Nœuds publics du graphe, triés par titre (pour l'index `/n`). */
export async function listNodes(): Promise<PublicNode[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('space')
    .select('id, slug, title, description, node_type, verification')
    .eq('kind', 'node')
    .order('title', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toPublicNode);
}

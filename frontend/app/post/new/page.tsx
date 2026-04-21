import { PostComposer } from '@/components/home/post-composer';
import { PageContainer } from '@/components/layout/page-container';
import { createPostAction } from '@/lib/actions/posts';
import { requireSession } from '@/lib/guards/require-session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SubjectView } from '@/lib/types/screens';

function toComposerErrorMessage(code: string | undefined) {
  if (!code) return null;
  if (code === 'publish_failed')
    return 'Publication impossible pour le moment. Reessayez.';
  return 'Publication impossible pour le moment. Reessayez.';
}

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession('/post/new');
  const { error } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const subjectsResult = await supabase
    .from('subject')
    .select('id, slug, name, emoji, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  const subjects: SubjectView[] = (subjectsResult.data ?? []).map((row) => ({
    id: String((row as { id?: string }).id ?? ''),
    slug: String((row as { slug?: string }).slug ?? ''),
    name: String((row as { name?: string }).name ?? ''),
    emoji: (row as { emoji?: string | null }).emoji ?? null,
    sort_order: Number((row as { sort_order?: number }).sort_order ?? 0),
  }));

  return (
    <PageContainer>
      <PostComposer
        action={createPostAction}
        redirectPath="/"
        initialError={toComposerErrorMessage(error)}
        subjects={subjects}
      />
    </PageContainer>
  );
}

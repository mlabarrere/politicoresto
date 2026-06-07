import { notFound, redirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PostEditForm } from '@/components/forum/post-edit-form';
import { updatePostAction } from '@/lib/actions/posts';
import { requireSession } from '@/lib/guards/require-session';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, userId } = await requireSession(`/post/${slug}/edit`);

  const { data: topic } = await supabase
    .from('topic')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (!topic) notFound();

  const { data: post } = await supabase
    .from('thread_post')
    .select('id, title, content, created_by, type, status')
    .eq('thread_id', topic.id)
    .eq('type', 'article')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!post) notFound();
  if (post.status !== 'published') notFound();
  if (post.created_by !== userId) redirect(`/post/${slug}`);

  // Forum-only release (Tranche 1): polls are frozen, so every post edits as a
  // plain article. A residual poll row (if any) is left untouched in the DB.
  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl">
        <PostEditForm
          action={updatePostAction}
          postItemId={String(post.id)}
          slug={topic.slug}
          initialTitle={String(post.title ?? '')}
          initialBody={String(post.content ?? '')}
          cancelHref={`/post/${slug}`}
        />
      </div>
    </PageContainer>
  );
}

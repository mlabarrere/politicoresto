import { notFound, redirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PollEditForm } from '@/components/forum/poll-edit-form';
import { PostEditForm } from '@/components/forum/post-edit-form';
import { updatePollAction, updatePostAction } from '@/lib/actions/posts';
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

  // Is this a poll? Check for an existing post_poll row + load question + options.
  const { data: pollRow } = await supabase
    .from('post_poll')
    .select('post_item_id, question')
    .eq('post_item_id', post.id)
    .maybeSingle();

  if (pollRow) {
    const { data: optionRows } = await supabase
      .from('post_poll_option')
      .select('id, label, sort_order')
      .eq('post_item_id', post.id)
      .order('sort_order', { ascending: true });

    const { data: responseRow } = await supabase
      .from('post_poll_response')
      .select('id')
      .eq('post_item_id', post.id)
      .limit(1)
      .maybeSingle();

    if (responseRow) {
      // Soft-lock: poll has votes. Bounce to detail page — menu item was
      // also disabled, but this is the belt-and-braces server gate.
      redirect(`/post/${slug}`);
    }

    return (
      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <PollEditForm
            action={updatePollAction}
            postItemId={String(post.id)}
            slug={topic.slug}
            initialQuestion={String(pollRow.question ?? '')}
            initialOptions={(optionRows ?? []).map((o) => String(o.label))}
            cancelHref={`/post/${slug}`}
          />
        </div>
      </PageContainer>
    );
  }

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

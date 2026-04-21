'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AppCard } from '@/components/app/app-card';
import { AppTabs } from '@/components/app/app-tabs';
import { formatDate } from '@/lib/utils/format';
import { normalizeMultilineText } from '@/lib/utils/multiline';

type PostItem = {
  id: string;
  thread_slug: string;
  title: string | null;
  content: string | null;
  created_at: string;
};

type CommentItem = {
  id: string;
  thread_slug: string;
  body_markdown: string;
  created_at: string;
};

export function PublicProfileTabs({
  posts,
  comments,
}: {
  posts: PostItem[];
  comments: CommentItem[];
}) {
  const [tab, setTab] = useState<'posts' | 'comments'>('posts');

  return (
    <AppTabs
      value={tab}
      onValueChange={(value) =>
        setTab(value === 'comments' ? 'comments' : 'posts')
      }
      items={[
        {
          key: 'posts',
          label: 'Posts',
          content: (
            <div className="mt-3 space-y-3">
              {posts.length ? (
                posts.map((post) => (
                  <AppCard key={post.id} className="space-y-2 p-3">
                    <Link
                      href={`/post/${post.thread_slug}`}
                      className="text-base font-semibold text-foreground hover:underline"
                    >
                      {post.title ?? 'Post sans titre'}
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {normalizeMultilineText(post.content ?? '')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(post.created_at)}
                    </p>
                  </AppCard>
                ))
              ) : (
                <AppCard className="p-4 text-sm text-muted-foreground">
                  Aucun post public.
                </AppCard>
              )}
            </div>
          ),
        },
        {
          key: 'comments',
          label: 'Comments',
          content: (
            <div className="mt-3 space-y-3">
              {comments.length ? (
                comments.map((comment) => (
                  <AppCard key={comment.id} className="space-y-2 p-3">
                    <Link
                      href={`/post/${comment.thread_slug}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      Voir le post
                    </Link>
                    <p className="text-sm text-foreground/90 line-clamp-4">
                      {normalizeMultilineText(comment.body_markdown)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </p>
                  </AppCard>
                ))
              ) : (
                <AppCard className="p-4 text-sm text-muted-foreground">
                  Aucun commentaire public.
                </AppCard>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

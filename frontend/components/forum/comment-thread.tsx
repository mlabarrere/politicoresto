'use client';

import { useMemo } from 'react';
import { CommentNode } from '@/components/forum/comment-node';
import type { CommentThreadProps } from '@/lib/types/forum-components';

function sortTree(
  comments: CommentThreadProps['comments'],
  mode: CommentThreadProps['sortMode'],
) {
  const sorted = [...comments];

  sorted.sort((a, b) => {
    if (mode === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (mode === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    const scoreA = a.leftCount + a.rightCount;
    const scoreB = b.leftCount + b.rightCount;
    if (scoreB !== scoreA) return scoreB - scoreA;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return sorted;
}

export function CommentThread({
  comments,
  sortMode,
  ...rest
}: CommentThreadProps) {
  const sortedComments = useMemo(
    () => sortTree(comments, sortMode),
    [comments, sortMode],
  );

  if (!sortedComments.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
        Aucun commentaire visible.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="comment-thread">
      {sortedComments.map((node) => (
        <CommentNode key={node.id} node={node} depth={0} {...rest} />
      ))}
    </div>
  );
}

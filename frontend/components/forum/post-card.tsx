"use client";

import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PostCardProps } from "@/lib/types/forum-components";
import { formatDate } from "@/lib/utils/format";

const COLLAPSE_LIMIT = 480;

export function PostCard({ post, initialExpanded = false }: PostCardProps) {
  const initials = post.author.username.slice(0, 2).toUpperCase();
  const [expanded, setExpanded] = useState(initialExpanded);
  const isLong = post.body.length > COLLAPSE_LIMIT;

  const visibleBody = useMemo(() => {
    if (!isLong || expanded) return post.body;
    return `${post.body.slice(0, COLLAPSE_LIMIT).trimEnd()}…`;
  }, [expanded, isLong, post.body]);

  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-4" aria-label="Post principal">
      <header className="flex items-start gap-3">
        <Avatar size="sm">
          <AvatarImage src={post.author.avatarUrl} alt={post.author.username} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-foreground">{post.author.username}</p>
          <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
        </div>
      </header>

      {post.title ? <h1 className="text-2xl font-semibold tracking-tight text-foreground">{post.title}</h1> : null}

      <div className="space-y-2">
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">{visibleBody}</p>
        {isLong ? (
          <button
            type="button"
            className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
            onClick={() => setExpanded((previous) => !previous)}
            aria-expanded={expanded}
          >
            {expanded ? "Réduire" : "Lire plus"}
          </button>
        ) : null}
      </div>
    </article>
  );
}


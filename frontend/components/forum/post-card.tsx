"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";

import { AppAvatar, AppAvatarFallback, AppAvatarImage } from "@/components/app/app-avatar";
import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { PollCardInline } from "@/components/poll/poll-card-inline";
import type { PostCardProps } from "@/lib/types/forum-components";
import { formatDate } from "@/lib/utils/format";

const COLLAPSE_LIMIT = 480;

export function PostCard({
  post,
  initialExpanded = false,
  isAuthenticated = false
}: PostCardProps & { isAuthenticated?: boolean }) {
  const initials = post.author.username.slice(0, 2).toUpperCase();
  const [expanded, setExpanded] = useState(initialExpanded);
  const isLong = post.body.length > COLLAPSE_LIMIT;

  const visibleBody = useMemo(() => {
    if (!isLong || expanded) return post.body;
    return `${post.body.slice(0, COLLAPSE_LIMIT).trimEnd()}…`;
  }, [expanded, isLong, post.body]);

  return (
    <AppCard as="article" className="space-y-4 p-4" aria-label="Post principal">
      <header className="flex items-start gap-3">
        <AppAvatar size="sm">
          <AppAvatarImage src={post.author.avatarUrl} alt={post.author.username} width={24} height={24} />
          <AppAvatarFallback>{initials}</AppAvatarFallback>
        </AppAvatar>
        <div>
          {post.author.slug ? (
            <Link href={`/user/${post.author.slug}` as Route} className="text-sm font-semibold text-foreground hover:underline">
              @{post.author.username}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-foreground">@{post.author.username}</p>
          )}
          <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
        </div>
      </header>

      {post.title ? <h1 className="text-2xl font-semibold tracking-tight text-foreground">{post.title}</h1> : null}

      <div className="space-y-2">
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">{visibleBody}</p>
        {isLong ? (
          <AppButton
            type="button"
            variant="ghost"
            className="h-auto px-0 py-0 text-xs underline-offset-2 hover:underline"
            onClick={() => setExpanded((previous) => !previous)}
            aria-expanded={expanded}
          >
            {expanded ? "Réduire" : "Lire plus"}
          </AppButton>
        ) : null}
      </div>

      {post.pollSummary ? <PollCardInline poll={post.pollSummary} isAuthenticated={isAuthenticated} /> : null}
    </AppCard>
  );
}





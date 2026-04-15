"use client";

import { MessageSquare } from "lucide-react";

import { VoteBinaryLR } from "@/components/forum/vote-binary-lr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PostCardProps } from "@/lib/types/forum-components";
import { formatDate, formatNumber } from "@/lib/utils/format";

export function PostCard({
  post,
  currentUserVote,
  isAuthenticated,
  redirectPath,
  onVoteChange,
  onReplyClick
}: PostCardProps) {
  const initials = post.author.username.slice(0, 2).toUpperCase();

  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-4" aria-label="Post principal">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={post.author.avatarUrl} alt={post.author.username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{post.author.username}</p>
            <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
          </div>
        </div>

        <VoteBinaryLR
          entityType="post"
          value={currentUserVote}
          leftCount={post.leftCount}
          rightCount={post.rightCount}
          onChange={(next) => void onVoteChange(next)}
          isAuthenticated={isAuthenticated}
          redirectPath={redirectPath}
        />
      </header>

      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">{post.body}</p>

      <footer className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{formatNumber(post.commentCount)} commentaires</span>
        <Button type="button" variant="outline" size="sm" onClick={onReplyClick}>
          <MessageSquare className="size-3.5" /> Commenter
        </Button>
      </footer>
    </article>
  );
}


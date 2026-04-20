"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import { AppButton } from "@/components/app/app-button";
import { AuthRequiredSheet } from "@/components/auth/auth-required-sheet";
import { applyReactionTransition, type ReactionCountsState, type ReactionSide } from "@/lib/reactions";
import { formatNumber } from "@/lib/utils/format";
import { ArrowLeft, ArrowRight } from "lucide-react";

const REACTIONS = [
  {
    side: "gauche",
    icon: ArrowLeft,
    tooltip: "C'est de gauche !",
    activeClass: "border-rose-600 bg-rose-600 text-white shadow-sm shadow-rose-500/25",
    inactiveClass: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
  },
  {
    side: "droite",
    icon: ArrowRight,
    tooltip: "C'est de droite !",
    activeClass: "border-sky-600 bg-sky-600 text-white shadow-sm shadow-sky-500/25",
    inactiveClass: "border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
  }
] as const;

export const ReactionBar = memo(function ReactionBar({
  targetType,
  targetId,
  redirectPath,
  leftVotes = 0,
  rightVotes = 0,
  currentVote = null,
  compact = false,
  isAuthenticated = false
}: {
  targetType: "post" | "comment";
  targetId: string;
  redirectPath: string;
  leftVotes?: number | null;
  rightVotes?: number | null;
  currentVote?: ReactionSide | null;
  compact?: boolean;
  isAuthenticated?: boolean;
}) {
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const [state, setState] = useState<ReactionCountsState>({
    leftVotes: Number(leftVotes ?? 0),
    rightVotes: Number(rightVotes ?? 0),
    currentVote
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setState({
      leftVotes: Number(leftVotes ?? 0),
      rightVotes: Number(rightVotes ?? 0),
      currentVote
    });
  }, [leftVotes, rightVotes, currentVote]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onReact = useCallback(
    async (side: ReactionSide) => {
      if (isSubmitting) return;

      const previousState = state;
      const optimisticState = applyReactionTransition(previousState, side);
      setState(optimisticState);
      setIsSubmitting(true);
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      try {
        const response = await fetch("/api/reactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            targetType,
            targetId,
            side
          })
        });

        if (!response.ok) {
          throw new Error("reaction mutation failed");
        }

        const payload = (await response.json()) as {
          leftVotes?: number;
          rightVotes?: number;
          currentVote?: ReactionSide | "left" | "right" | null;
        };
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return;

        const normalizedVote =
          payload.currentVote === "gauche" || payload.currentVote === "left"
            ? "gauche"
            : payload.currentVote === "droite" || payload.currentVote === "right"
              ? "droite"
              : null;

        setState({
          leftVotes: Number(payload.leftVotes ?? optimisticState.leftVotes),
          rightVotes: Number(payload.rightVotes ?? optimisticState.rightVotes),
          currentVote: normalizedVote
        });
      } catch {
        if (isMountedRef.current && currentRequestId === requestIdRef.current) {
          setState(previousState);
        }
      }
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, state, targetId, targetType]
  );

  return (
    <div className="flex items-center gap-2">
      {REACTIONS.map((reaction) => {
        const Icon = reaction.icon;
        const isActive = state.currentVote === reaction.side;
        const buttonClassName = `group relative inline-flex min-w-[72px] items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${isActive ? reaction.activeClass : reaction.inactiveClass} ${isSubmitting ? "cursor-wait opacity-90" : "cursor-pointer"} ${isActive ? "scale-[1.02]" : "scale-100"} active:scale-95`;
        const content = (
          <>
            <Icon className="size-3.5" />
            <span>{formatNumber(reaction.side === "gauche" ? state.leftVotes : state.rightVotes)}</span>
            {!compact ? (
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-[10px] whitespace-nowrap text-background opacity-0 transition group-hover:opacity-100">
                {reaction.tooltip}
              </span>
            ) : null}
            <span className="sr-only">
              {reaction.tooltip}
            </span>
          </>
        );

        if (!isAuthenticated) {
          return (
            <AuthRequiredSheet
              key={reaction.side}
              nextPath={redirectPath}
              triggerLabel={reaction.tooltip}
              triggerClassName={buttonClassName}
              triggerContent={content}
            />
          );
        }

        return (
          <AppButton
            key={reaction.side}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={reaction.tooltip}
            aria-pressed={isActive}
            data-active={isActive ? "true" : "false"}
            className={buttonClassName}
            onClick={() => {
              void onReact(reaction.side);
            }}
            disabled={isSubmitting}
          >
            {content}
          </AppButton>
        );
      })}
    </div>
  );
});


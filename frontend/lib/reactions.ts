import type { ReactionSide } from "@/lib/types/domain";

export type { ReactionSide };

export const REACTION_SIDE_TO_TYPE: Record<ReactionSide, "upvote" | "downvote"> = {
  gauche: "upvote",
  droite: "downvote"
};

export const REACTION_TYPE_TO_SIDE: Record<"upvote" | "downvote", ReactionSide> = {
  upvote: "gauche",
  downvote: "droite"
};

export type ReactionCountsState = {
  leftVotes: number;
  rightVotes: number;
  currentVote: ReactionSide | null;
};

export function applyReactionTransition(
  previous: ReactionCountsState,
  side: ReactionSide
): ReactionCountsState {
  if (previous.currentVote === side) {
    if (side === "gauche") {
      return {
        leftVotes: Math.max(0, previous.leftVotes - 1),
        rightVotes: previous.rightVotes,
        currentVote: null
      };
    }

    return {
      leftVotes: previous.leftVotes,
      rightVotes: Math.max(0, previous.rightVotes - 1),
      currentVote: null
    };
  }

  if (previous.currentVote === null) {
    if (side === "gauche") {
      return {
        leftVotes: previous.leftVotes + 1,
        rightVotes: previous.rightVotes,
        currentVote: "gauche"
      };
    }

    return {
      leftVotes: previous.leftVotes,
      rightVotes: previous.rightVotes + 1,
      currentVote: "droite"
    };
  }

  if (previous.currentVote === "gauche" && side === "droite") {
    return {
      leftVotes: Math.max(0, previous.leftVotes - 1),
      rightVotes: previous.rightVotes + 1,
      currentVote: "droite"
    };
  }

  return {
    leftVotes: previous.leftVotes + 1,
    rightVotes: Math.max(0, previous.rightVotes - 1),
    currentVote: "gauche"
  };
}



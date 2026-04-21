import type { VoteSide } from '@/lib/types/forum';

export type BackendReactionSide = 'gauche' | 'droite' | null;

export function toBackendVoteSide(side: VoteSide): BackendReactionSide {
  if (side === 'left') return 'gauche';
  if (side === 'right') return 'droite';
  return null;
}

export function fromBackendVoteSide(side: BackendReactionSide): VoteSide {
  if (side === 'gauche') return 'left';
  if (side === 'droite') return 'right';
  return null;
}

export function computeNextVote(
  current: VoteSide,
  clicked: VoteSide,
): VoteSide {
  if (clicked === null) return null;
  if (current === clicked) return null;
  return clicked;
}

export function applyVoteTransition(
  current: { leftCount: number; rightCount: number; currentVote: VoteSide },
  next: VoteSide,
): { leftCount: number; rightCount: number; currentVote: VoteSide } {
  let left = current.leftCount;
  let right = current.rightCount;

  if (current.currentVote === 'left') left = Math.max(0, left - 1);
  if (current.currentVote === 'right') right = Math.max(0, right - 1);

  if (next === 'left') left += 1;
  if (next === 'right') right += 1;

  return {
    leftCount: left,
    rightCount: right,
    currentVote: next,
  };
}

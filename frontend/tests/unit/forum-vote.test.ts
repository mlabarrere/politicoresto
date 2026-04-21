import { describe, expect, it } from 'vitest';
import {
  applyVoteTransition,
  computeNextVote,
  fromBackendVoteSide,
  toBackendVoteSide,
} from '@/lib/forum/vote';

describe('forum vote transitions', () => {
  it('maps backend sides', () => {
    expect(toBackendVoteSide('left')).toBe('gauche');
    expect(toBackendVoteSide('right')).toBe('droite');
    expect(fromBackendVoteSide('gauche')).toBe('left');
    expect(fromBackendVoteSide('droite')).toBe('right');
  });

  it('handles tri-state transitions', () => {
    expect(computeNextVote(null, 'left')).toBe('left');
    expect(computeNextVote('left', 'left')).toBe(null);
    expect(computeNextVote('left', 'right')).toBe('right');
  });

  it('updates counters without aggregate score', () => {
    expect(
      applyVoteTransition(
        { leftCount: 2, rightCount: 1, currentVote: null },
        'left',
      ),
    ).toEqual({ leftCount: 3, rightCount: 1, currentVote: 'left' });

    expect(
      applyVoteTransition(
        { leftCount: 3, rightCount: 1, currentVote: 'left' },
        null,
      ),
    ).toEqual({ leftCount: 2, rightCount: 1, currentVote: null });
  });
});

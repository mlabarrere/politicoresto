import { describe, expect, it } from 'vitest';
import {
  computeBoussole,
  matchPoints,
  type PartyPosition,
} from '@/lib/boussole/scoring';

describe('boussole scoring', () => {
  it('matchPoints : identique = 2, un neutre = 1, opposé = 0', () => {
    expect(matchPoints('agree', 'agree')).toBe(2);
    expect(matchPoints('disagree', 'disagree')).toBe(2);
    expect(matchPoints('agree', 'neutral')).toBe(1);
    expect(matchPoints('neutral', 'disagree')).toBe(1);
    expect(matchPoints('agree', 'disagree')).toBe(0);
  });

  it('classe les partis par proximité et normalise le score dans [0,1]', () => {
    const parties: PartyPosition[] = [
      { party_slug: 'a', party_name: 'A', stances: { 1: 'agree', 2: 'agree' } },
      {
        party_slug: 'b',
        party_name: 'B',
        stances: { 1: 'disagree', 2: 'disagree' },
      },
    ];
    const result = computeBoussole({ 1: 'agree', 2: 'agree' }, parties);

    expect(result[0]?.party_slug).toBe('a');
    expect(result[0]?.score).toBe(1);
    expect(result[1]?.party_slug).toBe('b');
    expect(result[1]?.score).toBe(0);
  });

  it('ignore les thèses non répondues', () => {
    const parties: PartyPosition[] = [
      {
        party_slug: 'a',
        party_name: 'A',
        stances: { 1: 'agree', 2: 'disagree' },
      },
    ];
    const result = computeBoussole({ 1: 'agree' }, parties);
    expect(result[0]?.score).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  computeBoussole,
  computeLeftRight,
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

describe('computeLeftRight', () => {
  // thèse 1 : agree → gauche (-1) · thèse 2 : agree → droite (+1) · thèse 3 : hors-axe (0)
  const weights = { 1: -1, 2: 1, 3: 0 };

  it('renvoie -1 quand l’utilisateur est pleinement à gauche', () => {
    // d’accord avec la thèse de gauche, pas d’accord avec celle de droite
    expect(computeLeftRight({ 1: 'agree', 2: 'disagree' }, weights)).toBe(-1);
  });

  it('renvoie +1 quand l’utilisateur est pleinement à droite', () => {
    expect(computeLeftRight({ 1: 'disagree', 2: 'agree' }, weights)).toBe(1);
  });

  it('renvoie 0 au centre (positions opposées qui se compensent)', () => {
    expect(computeLeftRight({ 1: 'agree', 2: 'agree' }, weights)).toBe(0);
  });

  it('ignore les thèses hors-axe (poids 0) et non répondues', () => {
    expect(computeLeftRight({ 1: 'agree', 3: 'agree' }, weights)).toBe(-1);
    expect(computeLeftRight({}, weights)).toBe(0);
  });

  it('normalise sur les poids engagés et arrondit à 3 décimales', () => {
    // un seul axe engagé, neutre → 0 ; deux axes, un neutre → moyenne
    expect(computeLeftRight({ 1: 'neutral', 2: 'agree' }, weights)).toBe(0.5);
  });
});

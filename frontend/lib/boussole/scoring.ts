/**
 * Scoring de la Boussole (VAA) — méthode Wahl-O-Mat transparente : 2 / 1 / 0.
 * Fonction pure, sans I/O : calcule la proximité entre les réponses de
 * l'utilisateur et les positions de chaque parti (PRD §4.6 / FR-23 / FR-24).
 */
export type Stance = 'agree' | 'neutral' | 'disagree';

export interface PartyPosition {
  party_slug: string;
  party_name: string;
  /** Position du parti par numéro de thèse (`ordering`). */
  stances: Record<number, Stance>;
}

/** Poids gauche/droite d'une thèse : effet d'un « agree ». -1 gauche, +1 droite, 0 hors-axe. */
export type ThesisAxisWeights = Record<number, number>;

const STANCE_SIGN: Record<Stance, number> = {
  agree: 1,
  neutral: 0,
  disagree: -1,
};

/**
 * Position gauche↔droite de l'utilisateur, normalisée dans [-1, 1]
 * (négatif = gauche, positif = droite). On somme, par thèse répondue,
 * `signe(réponse) × poids_axe`, puis on divise par le total des poids
 * absolus engagés (thèses hors-axe ou non répondues ignorées). FR-41.
 */
export function computeLeftRight(
  answers: Record<number, Stance>,
  axisWeights: ThesisAxisWeights,
): number {
  let weighted = 0;
  let engaged = 0;
  for (const ordering of Object.keys(answers).map(Number)) {
    const weight = axisWeights[ordering] ?? 0;
    if (weight === 0) continue;
    const stance = answers[ordering];
    if (!stance) continue;
    weighted += STANCE_SIGN[stance] * weight;
    engaged += Math.abs(weight);
  }
  if (engaged === 0) return 0;
  // Arrondi à 3 décimales (aligné sur numeric(4,3) côté DB).
  return Math.round((weighted / engaged) * 1000) / 1000;
}

export interface BoussoleResult {
  party_slug: string;
  party_name: string;
  /** Proximité normalisée dans [0, 1]. */
  score: number;
}

/** Points d'accord entre deux positions : identique = 2, un neutre = 1, opposé = 0. */
export function matchPoints(user: Stance, party: Stance): number {
  if (user === party) return 2;
  if (user === 'neutral' || party === 'neutral') return 1;
  return 0;
}

/**
 * Classe les partis par proximité avec les réponses de l'utilisateur.
 * `answers` : stance par numéro de thèse. Les thèses sans réponse sont ignorées.
 */
export function computeBoussole(
  answers: Record<number, Stance>,
  parties: PartyPosition[],
): BoussoleResult[] {
  const answered = Object.keys(answers).map(Number);
  const maxPoints = answered.length * 2;

  return parties
    .map((party) => {
      let points = 0;
      for (const ordering of answered) {
        const userStance = answers[ordering];
        const partyStance = party.stances[ordering];
        if (userStance && partyStance) {
          points += matchPoints(userStance, partyStance);
        }
      }
      return {
        party_slug: party.party_slug,
        party_name: party.party_name,
        score: maxPoints > 0 ? points / maxPoints : 0,
      };
    })
    .sort((a, b) => b.score - a.score);
}

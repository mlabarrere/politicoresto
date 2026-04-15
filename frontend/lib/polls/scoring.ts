export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

export function representativityLabel(score: number) {
  const safe = clampScore(score);
  if (safe < 35) return "Faible";
  if (safe < 65) return "Moyenne";
  return "Solide";
}

export function confidenceHint(score: number, sampleSize: number) {
  const safeScore = clampScore(score);
  if (sampleSize < 20) {
    return "Panel encore tres limite";
  }
  if (safeScore < 35) {
    return "Composition encore loin de la cible";
  }
  if (safeScore < 65) {
    return "Signal utile mais encore mouvant";
  }
  return "Signal plus stable, reste evolutif";
}

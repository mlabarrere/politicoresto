/**
 * Jauge gauche↔droite : positionne `value` (∈ [-1, 1]) sur un axe horizontal.
 * Présentation pure (Server Component possible), sans dépendance — une seule
 * valeur statique ne justifie pas une lib de charting (cf. library-first). Le
 * graphe temporel multi-points, lui, utilise Recharts.
 */
export function LeftRightGauge({ value }: { value: number }) {
  const clamped = Math.max(-1, Math.min(1, value));
  const percent = ((clamped + 1) / 2) * 100;
  const label =
    clamped < -0.05 ? 'Gauche' : clamped > 0.05 ? 'Droite' : 'Centre';

  return (
    <div className="space-y-1">
      <div
        className="relative h-2 w-full rounded-full bg-gradient-to-r from-rose-500 via-zinc-300 to-blue-600"
        role="img"
        aria-label={`Position : ${label} (${clamped.toFixed(2)} sur l’axe gauche-droite)`}
      >
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
          style={{ left: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Gauche</span>
        <span className="font-medium text-foreground">{label}</span>
        <span>Droite</span>
      </div>
    </div>
  );
}

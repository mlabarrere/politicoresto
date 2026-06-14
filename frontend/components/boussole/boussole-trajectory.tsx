'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppCard } from '@/components/app/app-card';
import type { BoussolePoint } from '@/lib/data/authenticated/boussole-trajectory';

export interface TrajectoryDatum {
  label: string;
  value: number;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

/**
 * Transforme l'historique en série pour le graphe (fonction pure, testée).
 * `value` ∈ [-1, 1] : négatif = gauche, positif = droite.
 */
export function buildTrajectorySeries(
  points: BoussolePoint[],
): TrajectoryDatum[] {
  return points.map((point) => ({
    label: dateFmt.format(new Date(point.takenAt)),
    value: point.leftRight,
  }));
}

export function BoussoleTrajectory({ points }: { points: BoussolePoint[] }) {
  if (points.length === 0) {
    return (
      <AppCard className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          Ta position dans le temps
        </h2>
        <p className="text-sm text-muted-foreground">
          Tu n’as pas encore enregistré de position. Fais la{' '}
          <a className="font-medium text-foreground underline" href="/boussole">
            Boussole
          </a>{' '}
          puis enregistre ton résultat — il apparaîtra ici.
        </p>
      </AppCard>
    );
  }

  const series = buildTrajectorySeries(points);

  return (
    <AppCard className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Ta position dans le temps
        </h2>
        <p className="text-sm text-muted-foreground">
          {points.length} mesure{points.length > 1 ? 's' : ''} · axe gauche ↔
          droite (privé, visible de toi seul).
        </p>
      </div>

      <div className="h-56 w-full" data-testid="boussole-trajectory-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              opacity={0.1}
            />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              tick={{ fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke="currentColor" opacity={0.3} />
            <Tooltip
              formatter={(value) => [Number(value).toFixed(2), 'Position']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AppCard>
  );
}

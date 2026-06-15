'use client';

import {
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { AppCard } from '@/components/app/app-card';
import type { CompassMarker } from '@/lib/boussole/scoring';

/**
 * Compas politique 2D (FR-40) : projette l'utilisateur et les partis sur deux
 * axes — économique (x) × culturel (y). Présentation pure ; le positionnement
 * est calculé en amont (`buildCompass`). Cf. trajectory pour le pattern Recharts.
 */
export function BoussoleCompass({ markers }: { markers: CompassMarker[] }) {
  const me = markers.filter((marker) => marker.isUser);
  const parties = markers.filter((marker) => !marker.isUser);

  return (
    <AppCard className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ton compas politique
        </p>
        <p className="text-sm text-muted-foreground">
          Axe horizontal : économique (interventionniste ↔ marché). Axe vertical
          : culturel (progressiste ↔ conservateur).
        </p>
      </div>

      <div
        className="aspect-square w-full"
        data-testid="boussole-compass-chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              opacity={0.1}
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-1, 1]}
              ticks={[-1, 0, 1]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => (v < 0 ? 'Interv.' : v > 0 ? 'Marché' : '')}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-1, 1]}
              ticks={[-1, 0, 1]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                v < 0 ? 'Progress.' : v > 0 ? 'Conserv.' : ''
              }
            />
            <ZAxis range={[130, 130]} />
            <ReferenceLine x={0} stroke="currentColor" opacity={0.3} />
            <ReferenceLine y={0} stroke="currentColor" opacity={0.3} />
            <Scatter data={parties} fill="#71717a" isAnimationActive={false}>
              <LabelList dataKey="label" position="top" fontSize={10} />
            </Scatter>
            <Scatter data={me} fill="#2563eb" isAnimationActive={false}>
              <LabelList
                dataKey="label"
                position="top"
                fontSize={12}
                fontWeight={700}
              />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </AppCard>
  );
}

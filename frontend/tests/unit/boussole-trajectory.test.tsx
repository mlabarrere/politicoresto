import { describe, expect, it } from 'vitest';
import { buildTrajectorySeries } from '@/components/boussole/boussole-trajectory';
import type { BoussolePoint } from '@/lib/data/authenticated/boussole-trajectory';

describe('buildTrajectorySeries', () => {
  it('mappe chaque point vers {label, value} dans l’ordre', () => {
    const points: BoussolePoint[] = [
      {
        id: '1',
        leftRight: -0.5,
        topPartySlug: 'lfi',
        takenAt: '2026-01-15T10:00:00Z',
      },
      {
        id: '2',
        leftRight: 0.25,
        topPartySlug: 'lr',
        takenAt: '2026-03-20T10:00:00Z',
      },
    ];
    const series = buildTrajectorySeries(points);
    expect(series.map((d) => d.value)).toEqual([-0.5, 0.25]);
    expect(series).toHaveLength(2);
    expect(series[0]!.label).toMatch(/2026|janv/i);
  });
});

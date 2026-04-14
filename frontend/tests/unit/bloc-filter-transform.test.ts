import { describe, expect, it } from "vitest";

type BlocRow = {
  bloc_code: string;
  bloc_label: string;
  bloc_order: number;
  parliamentary_group_code: string;
  parliamentary_group_label: string;
  group_order: number;
};

function transformBlocSidebar(rows: BlocRow[]) {
  const blocs = new Map<
    string,
    {
      code: string;
      label: string;
      order: number;
      groups: Array<{ code: string; label: string; order: number }>;
    }
  >();

  for (const row of rows) {
    if (!blocs.has(row.bloc_code)) {
      blocs.set(row.bloc_code, {
        code: row.bloc_code,
        label: row.bloc_label,
        order: row.bloc_order,
        groups: []
      });
    }

    blocs.get(row.bloc_code)!.groups.push({
      code: row.parliamentary_group_code,
      label: row.parliamentary_group_label,
      order: row.group_order
    });
  }

  return [...blocs.values()]
    .sort((a, b) => a.order - b.order)
    .map((bloc) => ({
      ...bloc,
      groups: bloc.groups.sort((a, b) => a.order - b.order || a.code.localeCompare(b.code))
    }));
}

describe("bloc filter transform", () => {
  it("keeps the five bloc buckets first and nests parliamentary groups under them", () => {
    const rows: BlocRow[] = [
      {
        bloc_code: "left-radical",
        bloc_label: "Gauche radicale a gauche",
        bloc_order: 1,
        parliamentary_group_code: "LFI-NFP",
        parliamentary_group_label: "LFI-NFP",
        group_order: 1
      },
      {
        bloc_code: "left-center-left",
        bloc_label: "Gauche a centre gauche",
        bloc_order: 2,
        parliamentary_group_code: "SOC",
        parliamentary_group_label: "SOC",
        group_order: 1
      },
      {
        bloc_code: "center",
        bloc_label: "Centre gauche a centre droit",
        bloc_order: 3,
        parliamentary_group_code: "EPR",
        parliamentary_group_label: "EPR",
        group_order: 1
      },
      {
        bloc_code: "center-right",
        bloc_label: "Centre droit a droite",
        bloc_order: 4,
        parliamentary_group_code: "DR",
        parliamentary_group_label: "DR",
        group_order: 1
      },
      {
        bloc_code: "right",
        bloc_label: "Droite a extreme droite",
        bloc_order: 5,
        parliamentary_group_code: "RN",
        parliamentary_group_label: "RN",
        group_order: 1
      }
    ];

    const result = transformBlocSidebar(rows);

    expect(result.map((bloc) => bloc.label)).toEqual([
      "Gauche radicale a gauche",
      "Gauche a centre gauche",
      "Centre gauche a centre droit",
      "Centre droit a droite",
      "Droite a extreme droite"
    ]);
    expect(result[0].groups).toEqual([{ code: "LFI-NFP", label: "LFI-NFP", order: 1 }]);
    expect(result[4].groups).toEqual([{ code: "RN", label: "RN", order: 1 }]);
  });
});

import { describe, expect, it } from "vitest";

import { getPoliticalBloc, matchesPoliticalBloc, politicalBlocs } from "@/lib/data/political-taxonomy";

describe("politicalBlocs", () => {
  it("exports at least 5 blocs", () => {
    expect(politicalBlocs.length).toBeGreaterThanOrEqual(5);
  });

  it("each bloc has slug, label, description, aliases", () => {
    for (const bloc of politicalBlocs) {
      expect(typeof bloc.slug).toBe("string");
      expect(typeof bloc.label).toBe("string");
      expect(typeof bloc.description).toBe("string");
      expect(Array.isArray(bloc.aliases)).toBe(true);
    }
  });
});

describe("getPoliticalBloc", () => {
  it("returns bloc by exact slug", () => {
    const bloc = getPoliticalBloc("gauche-radicale");
    expect(bloc?.slug).toBe("gauche-radicale");
  });

  it("returns bloc by alias", () => {
    const bloc = getPoliticalBloc("lfi");
    expect(bloc?.slug).toBe("gauche-radicale");
  });

  it("is case insensitive", () => {
    const bloc = getPoliticalBloc("LFI");
    expect(bloc?.slug).toBe("gauche-radicale");
  });

  it("returns null for unknown slug", () => {
    expect(getPoliticalBloc("unknown-party")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getPoliticalBloc("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(getPoliticalBloc(null)).toBeNull();
  });

  it("matches RN to droite-extreme-droite", () => {
    const bloc = getPoliticalBloc("rn");
    expect(bloc?.slug).toBe("droite-extreme-droite");
  });

  it("matches re to centre-gauche-centre-droit", () => {
    const bloc = getPoliticalBloc("re");
    expect(bloc?.slug).toBe("centre-gauche-centre-droit");
  });

  it("matches ps to gauche-centre-gauche", () => {
    const bloc = getPoliticalBloc("ps");
    expect(bloc?.slug).toBe("gauche-centre-gauche");
  });

  it("matches lr to centre-droit-droite", () => {
    const bloc = getPoliticalBloc("lr");
    expect(bloc?.slug).toBe("centre-droit-droite");
  });
});

describe("matchesPoliticalBloc", () => {
  it("returns true when blocSlug is null (no filter)", () => {
    const row = { entity_slug: "parti-x" };
    expect(matchesPoliticalBloc(row, null)).toBe(true);
  });

  it("returns true when bloc is not found (unknown filter)", () => {
    const row = { entity_slug: "parti-x" };
    expect(matchesPoliticalBloc(row, "unknown")).toBe(true);
  });

  it("returns true when row matches bloc slug token", () => {
    const row = { primary_taxonomy_slug: "gauche-radicale" };
    expect(matchesPoliticalBloc(row, "gauche-radicale")).toBe(true);
  });

  it("returns true when row matches bloc alias token", () => {
    const row = { space_role: "lfi" };
    expect(matchesPoliticalBloc(row, "gauche-radicale")).toBe(true);
  });

  it("returns false when row has no matching token", () => {
    const row = { entity_slug: "macron", feed_reason_code: "editorial" };
    expect(matchesPoliticalBloc(row, "gauche-radicale")).toBe(false);
  });

  it("handles row with all null token fields", () => {
    const row = {
      bloc_slug: null,
      space_role: null,
      entity_slug: null,
      primary_taxonomy_slug: null,
      primary_taxonomy_label: null,
      space_slug: null,
      feed_reason_code: null
    };
    expect(matchesPoliticalBloc(row, "gauche-radicale")).toBe(false);
  });
});

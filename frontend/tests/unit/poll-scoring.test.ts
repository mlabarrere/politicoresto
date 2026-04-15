import { describe, expect, it } from "vitest";

import { clampScore, confidenceHint, representativityLabel } from "@/lib/polls/scoring";

describe("poll scoring helpers", () => {
  it("clamps score between 0 and 100", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(42.345)).toBe(42.35);
    expect(clampScore(180)).toBe(100);
  });

  it("returns stable labels", () => {
    expect(representativityLabel(12)).toBe("Faible");
    expect(representativityLabel(50)).toBe("Moyenne");
    expect(representativityLabel(80)).toBe("Solide");
  });

  it("returns low-sample warning first", () => {
    expect(confidenceHint(90, 9)).toMatch(/limite/i);
    expect(confidenceHint(30, 40)).toMatch(/loin/i);
    expect(confidenceHint(55, 80)).toMatch(/mouvant/i);
    expect(confidenceHint(80, 120)).toMatch(/stable/i);
  });
});

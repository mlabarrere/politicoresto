import { describe, expect, it, vi, afterEach } from "vitest";
import { formatDate, formatNumber } from "@/lib/utils/format";

describe("formatNumber", () => {
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats null as 0", () => {
    expect(formatNumber(null)).toBe("0");
  });

  it("formats undefined as 0", () => {
    expect(formatNumber(undefined)).toBe("0");
  });

  it("formats NaN as 0", () => {
    expect(formatNumber(NaN)).toBe("0");
  });

  it("formats a positive number", () => {
    const result = formatNumber(1000);
    expect(result).toMatch(/1[\s\u00A0]?000/);
  });

  it("formats a small number", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

describe("formatDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Non renseigné' for null", () => {
    expect(formatDate(null)).toBe("Non renseigné");
  });

  it("returns 'Non renseigné' for undefined", () => {
    expect(formatDate(undefined)).toBe("Non renseigné");
  });

  it("returns original value for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("formats a recent date relatively (minutes)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00Z"));
    const fiveMinutesAgo = new Date("2026-04-19T11:55:00Z").toISOString();
    const result = formatDate(fiveMinutesAgo);
    expect(result).toMatch(/minute/);
  });

  it("formats a date in relative hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00Z"));
    const twoHoursAgo = new Date("2026-04-19T10:00:00Z").toISOString();
    const result = formatDate(twoHoursAgo);
    expect(result).toMatch(/heure/);
  });

  it("formats an old date as absolute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00Z"));
    const oldDate = new Date("2025-01-01T10:00:00Z").toISOString();
    const result = formatDate(oldDate);
    // Absolute format like "1 janv. 2025"
    expect(result).toMatch(/202[45]/);
  });
});

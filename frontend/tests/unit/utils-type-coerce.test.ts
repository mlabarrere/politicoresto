import { describe, expect, it } from "vitest";

import { isRecord, asNumber, asString, asBoolean } from "@/lib/utils/type-coerce";

describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isRecord([])).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isRecord("string")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
  });

  it("returns true for empty object", () => {
    expect(isRecord({})).toBe(true);
  });
});

describe("asNumber", () => {
  it("returns the number when finite", () => {
    expect(asNumber(42)).toBe(42);
    expect(asNumber(3.14)).toBe(3.14);
    expect(asNumber(0)).toBe(0);
  });

  it("returns fallback for non-number values", () => {
    expect(asNumber("42")).toBe(0);
    expect(asNumber(null)).toBe(0);
    expect(asNumber(undefined)).toBe(0);
    expect(asNumber({})).toBe(0);
  });

  it("returns fallback for Infinity", () => {
    expect(asNumber(Infinity)).toBe(0);
    expect(asNumber(-Infinity)).toBe(0);
  });

  it("returns fallback for NaN", () => {
    expect(asNumber(NaN)).toBe(0);
  });

  it("uses custom fallback", () => {
    expect(asNumber("bad", 99)).toBe(99);
  });
});

describe("asString", () => {
  it("returns the string value", () => {
    expect(asString("hello")).toBe("hello");
    expect(asString("")).toBe("");
  });

  it("returns null for non-string values by default", () => {
    expect(asString(42)).toBeNull();
    expect(asString(null)).toBeNull();
    expect(asString(undefined)).toBeNull();
    expect(asString(true)).toBeNull();
  });

  it("uses custom fallback", () => {
    expect(asString(42, "fallback")).toBe("fallback");
  });
});

describe("asBoolean", () => {
  it("returns true for true", () => {
    expect(asBoolean(true)).toBe(true);
  });

  it("returns false for false", () => {
    expect(asBoolean(false)).toBe(false);
  });

  it("returns fallback for non-booleans", () => {
    expect(asBoolean("true")).toBe(false);
    expect(asBoolean(1)).toBe(false);
    expect(asBoolean(null)).toBe(false);
  });

  it("uses custom fallback", () => {
    expect(asBoolean("yes", true)).toBe(true);
  });
});

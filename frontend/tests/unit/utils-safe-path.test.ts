import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/utils/safe-path";

describe("safeNextPath", () => {
  it("returns fallback for null", () => {
    expect(safeNextPath(null)).toBe("/");
  });

  it("returns fallback for undefined", () => {
    expect(safeNextPath(undefined)).toBe("/");
  });

  it("returns fallback for empty string", () => {
    expect(safeNextPath("")).toBe("/");
  });

  it("returns the path when it starts with /", () => {
    expect(safeNextPath("/me")).toBe("/me");
  });

  it("returns path with query string", () => {
    expect(safeNextPath("/me?section=security")).toBe("/me?section=security");
  });

  it("returns path with hash", () => {
    expect(safeNextPath("/me#profile")).toBe("/me#profile");
  });

  it("rejects paths not starting with /", () => {
    expect(safeNextPath("me")).toBe("/");
  });

  it("rejects protocol-relative paths (//)", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
  });

  it("rejects absolute URLs with protocol", () => {
    expect(safeNextPath("https://evil.com/path")).toBe("/");
  });

  it("rejects javascript: URLs", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("uses custom fallback", () => {
    expect(safeNextPath(null, "/home")).toBe("/home");
  });

  it("returns custom fallback for relative path", () => {
    expect(safeNextPath("relative", "/dashboard")).toBe("/dashboard");
  });
});

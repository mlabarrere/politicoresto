import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

const bannedClassPatterns = [
  /\btext-muted\b(?!-foreground)/,
  /\btext-accent\b(?!-foreground)/,
  /\btext-ink\b/,
  /\bbg-panel\b/,
  /\bbg-paper\b/,
  /\bborder-line\b/,
  /\btext-info\b/,
  /\btext-warning\b/
];

const sourceFiles = [
  "app/page.tsx",
  "app/auth/login/page.tsx",
  "app/(public)/topics/page.tsx",
  "app/(public)/topic/[slug]/page.tsx",
  "app/(public)/spaces/page.tsx",
  "app/(public)/space/[slug]/page.tsx",
  "app/(public)/cards/page.tsx",
  "app/(public)/profile/[username]/page.tsx",
  "app/(public)/poll/[id]/page.tsx",
  "components/layout/app-shell.tsx",
  "components/layout/site-header.tsx",
  "components/layout/site-footer.tsx",
  "components/layout/section-card.tsx",
  "components/layout/empty-state.tsx",
  "components/layout/screen-state.tsx",
  "app/not-found.tsx",
  "components/topics/topic-card.tsx",
  "components/navigation/main-nav.tsx",
  "components/navigation/auth-nav.tsx"
];

describe("UI standards", () => {
  it("does not use deprecated visual aliases in app-facing components", () => {
    for (const file of sourceFiles) {
      const source = fs.readFileSync(path.join(root, file), "utf8");

      for (const pattern of bannedClassPatterns) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it("does not lock page scrolling at the shell level", () => {
    const source = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

    expect(source).not.toContain("@apply relative overflow-hidden;");
    expect(source).not.toContain(".page-shell::before");
  });
});

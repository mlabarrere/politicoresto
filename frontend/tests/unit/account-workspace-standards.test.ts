import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("Account workspace standards", () => {
  it("renders account workspace through AppAccountShell with required sections", () => {
    const source = fs.readFileSync(path.join(root, "app/(authenticated)/me/page.tsx"), "utf8");

    expect(source).toContain("AppAccountShell");
    expect(source).toContain("AppUsernameField");
    expect(source).toContain("AppVoteHistoryList");
    expect(source).toContain("AppDraftList");
    expect(source).toContain("AppPostHistoryList");
    expect(source).toContain("AppCommentHistoryList");
    expect(source).toContain("AppDangerZone");
  });

  it("keeps /me/settings as redirect to unified account workspace", () => {
    const source = fs.readFileSync(path.join(root, "app/(authenticated)/me/settings/page.tsx"), "utf8");
    expect(source).toContain("redirect(\"/me?section=security\")");
  });

  it("uses AppPrimaryCTA global and removes legacy account shell files", () => {
    expect(fs.existsSync(path.join(root, "components/layout/authenticated-shell.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(root, "components/navigation/auth-nav.tsx"))).toBe(false);
  });
});

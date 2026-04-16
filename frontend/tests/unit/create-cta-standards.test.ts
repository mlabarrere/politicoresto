import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("Create CTA standards", () => {
  it("uses /post/new create route orchestration in shell", () => {
    const source = fs.readFileSync(path.join(root, "components/layout/app-shell.tsx"), "utf8");
    expect(source).toContain("AppHeader");
    expect(source).toContain("AppPrimaryCTA mode=\"fab\"");
    expect(source).not.toContain("CreateFlowProvider");
  });

  it("uses AppPrimaryCTA in global header", () => {
    const source = fs.readFileSync(path.join(root, "components/layout/app-header.tsx"), "utf8");
    expect(source).toContain("AppPrimaryCTA");
  });

  it("removes legacy create entrypoints", () => {
    const homeShell = fs.readFileSync(path.join(root, "components/home/homepage-shell.tsx"), "utf8");
    const rightSidebar = fs.readFileSync(path.join(root, "components/home/right-sidebar.tsx"), "utf8");

    expect(homeShell).not.toContain("CreatePostCTA");
    expect(rightSidebar).not.toContain("CreatePostCTA");
    expect(fs.existsSync(path.join(root, "components/home/create-post-cta.tsx"))).toBe(false);
  });

  it("removes global create drawer provider file", () => {
    expect(fs.existsSync(path.join(root, "components/layout/create-flow-provider.tsx"))).toBe(false);
  });
});

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("Feed unification", () => {
  it("uses AppFeedItem in PostFeed", () => {
    const source = fs.readFileSync(path.join(root, "components/home/post-feed.tsx"), "utf8");
    expect(source).toContain("AppFeedItem");
  });
});

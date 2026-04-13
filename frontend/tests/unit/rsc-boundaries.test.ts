import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("RSC boundaries", () => {
  it("keeps buttonVariants in a server-safe module for server components", () => {
    const files = [
      "app/page.tsx",
      "components/layout/empty-state.tsx",
      "components/layout/screen-state.tsx",
      "components/layout/site-header.tsx"
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(root, file), "utf8");

      expect(source).not.toMatch(/buttonVariants\s*}\s*from\s+"@\/components\/ui\/button"/);
      expect(source).not.toMatch(/buttonVariants\s*}\s*from\s+'@\/components\/ui\/button'/);
      expect(source).toContain('from "@/components/ui/button-variants"');
    }
  });
});

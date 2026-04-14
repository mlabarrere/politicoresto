import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("political reaction anti-spam foundation", () => {
  it("keeps one reaction row per user/target via SQL upsert conflict", () => {
    const sql = fs.readFileSync(
      path.join(root, "../supabase/migrations/20260413130000_presidential_feed_phase1.sql"),
      "utf8"
    );

    expect(sql).toContain("constraint reaction_target_user_unique unique (target_type, target_id, user_id)");
    expect(sql).toContain("on conflict (target_type, target_id, user_id) do update");
  });
});

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("political reaction anti-spam foundation", () => {
  it("keeps one reaction row per user/target via SQL uniqueness constraint", () => {
    const baseSql = fs.readFileSync(
      path.join(root, "../supabase/migrations/20260413130000_presidential_feed_phase1.sql"),
      "utf8"
    );
    const toggleSql = fs.readFileSync(
      path.join(root, "../supabase/migrations/20260415195000_reaction_toggle_rpc.sql"),
      "utf8"
    );

    expect(baseSql).toContain("constraint reaction_target_user_unique unique (target_type, target_id, user_id)");
    expect(toggleSql).toContain("if existing_row.reaction_type = p_reaction_type then");
    expect(toggleSql).toContain("delete from public.reaction where id = existing_row.id");
    expect(toggleSql).toContain("update public.reaction");
  });
});

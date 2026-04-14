import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

const serverActionFiles = [
  "lib/actions/comments.ts",
  "lib/actions/reactions.ts",
  "lib/actions/threads.ts",
  "lib/actions/vault.ts"
];

describe("sensitive vault boundary", () => {
  it("keeps mutation wrappers on the server client only", () => {
    for (const file of serverActionFiles) {
      const source = fs.readFileSync(path.join(root, file), "utf8");

      expect(source).toContain('"use server"');
      expect(source).toContain('createServerSupabaseClient');
      expect(source).not.toContain('createBrowserSupabaseClient');
    }
  });

  it("keeps sensitive writes behind vault RPC wrappers", () => {
    const source = fs.readFileSync(path.join(root, "lib/actions/vault.ts"), "utf8");

    expect(source).toContain('rpc_upsert_sensitive_consent');
    expect(source).toContain('rpc_upsert_private_political_profile');
    expect(source).toContain('rpc_upsert_private_vote_record');
  });

  it("routes the private settings surface through vault server actions", () => {
    const source = fs.readFileSync(path.join(root, "app/(authenticated)/me/settings/page.tsx"), "utf8");

    expect(source).toContain('upsertSensitiveConsentAction');
    expect(source).toContain('upsertPrivateProfileAction');
    expect(source).not.toContain('createBrowserSupabaseClient');
  });
});

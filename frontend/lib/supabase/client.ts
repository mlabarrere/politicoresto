"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "@/lib/supabase/env";

let client:
  | ReturnType<typeof createBrowserClient>
  | undefined;

export function createBrowserSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      supabaseEnv.url(),
      supabaseEnv.publishableKey()
    );
  }

  return client;
}

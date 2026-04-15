import { NextResponse } from "next/server";

import { normalizePostPollSummary } from "@/lib/polls/summary";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type VotePayload = {
  postItemId: string;
  optionId: string;
};

function isVotePayload(value: unknown): value is VotePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<VotePayload>;
  return (
    typeof payload.postItemId === "string" &&
    payload.postItemId.trim().length > 0 &&
    typeof payload.optionId === "string" &&
    payload.optionId.trim().length > 0
  );
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!isVotePayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error: voteError } = await supabase.rpc("submit_post_poll_vote", {
    p_post_item_id: body.postItemId,
    p_option_id: body.optionId
  });

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 400 });
  }

  const { data: pollRow, error: pollError } = await supabase
    .from("v_post_poll_summary")
    .select("*")
    .eq("post_item_id", body.postItemId)
    .maybeSingle();

  if (pollError || !pollRow) {
    return NextResponse.json({ error: pollError?.message ?? "Poll not found" }, { status: 404 });
  }

  const poll = normalizePostPollSummary(pollRow as Record<string, unknown>);
  if (!poll) {
    return NextResponse.json({ error: "Poll payload invalid" }, { status: 500 });
  }

  return NextResponse.json({ poll });
}

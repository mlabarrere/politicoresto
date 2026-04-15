import { NextResponse } from "next/server";

import { REACTION_SIDE_TO_TYPE, REACTION_TYPE_TO_SIDE, type ReactionSide } from "@/lib/reactions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fromBackendVoteSide } from "@/lib/forum/vote";

type ReactionPayload = {
  targetType: "post" | "comment";
  targetId: string;
  side: ReactionSide | "left" | "right";
};

function isReactionPayload(value: unknown): value is ReactionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ReactionPayload>;

  return (
    (payload.targetType === "post" || payload.targetType === "comment") &&
    typeof payload.targetId === "string" &&
    payload.targetId.trim().length > 0 &&
    (payload.side === "gauche" ||
      payload.side === "droite" ||
      payload.side === "left" ||
      payload.side === "right")
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
  if (!isReactionPayload(body)) {
    return NextResponse.json({ error: "Reaction payload invalid" }, { status: 400 });
  }

  const { data: existingReaction, error: existingReactionError } = await supabase
    .from("reaction")
    .select("reaction_type")
    .eq("target_type", body.targetType)
    .eq("target_id", body.targetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingReactionError) {
    return NextResponse.json({ error: existingReactionError.message }, { status: 400 });
  }

  const side = body.side === "left" ? "gauche" : body.side === "right" ? "droite" : body.side;
  const existingReactionType = existingReaction?.reaction_type as "upvote" | "downvote" | null;
  const requestedReactionType = REACTION_SIDE_TO_TYPE[side];
  const currentVote =
    existingReactionType === requestedReactionType
      ? null
      : fromBackendVoteSide(REACTION_TYPE_TO_SIDE[requestedReactionType]);

  const { error: rpcError } = await supabase.rpc("react_post", {
    p_target_type: body.targetType === "post" ? "post" : "comment",
    p_target_id: body.targetId,
    p_reaction_type: REACTION_SIDE_TO_TYPE[side]
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 400 });
  }

  const countsResult =
    body.targetType === "post"
      ? await supabase
          .from("v_posts")
          .select("gauche_count, droite_count")
          .eq("id", body.targetId)
          .maybeSingle()
      : await supabase
          .from("v_post_comments")
          .select("gauche_count, droite_count")
          .eq("id", body.targetId)
          .maybeSingle();

  if (countsResult.error) {
    return NextResponse.json({ error: countsResult.error.message }, { status: 400 });
  }

  const counts = countsResult.data ?? { gauche_count: 0, droite_count: 0 };

  return NextResponse.json({
    leftVotes: Number(counts.gauche_count ?? 0),
    rightVotes: Number(counts.droite_count ?? 0),
    currentVote
  });
}


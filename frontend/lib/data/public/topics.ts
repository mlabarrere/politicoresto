import type { LoadState, TopicDetailScreenData, TopicsScreenData } from "@/lib/types/screens";
import type { PredictionOptionRow, TopicPredictionAggregateView } from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  toLegacyPost,
  toPredictionQuestion,
  toThreadPost,
  toTopicAggregate,
  toTopicRow,
  toTopicSummary
} from "./canonical";

export async function getTopicsScreenData(): Promise<LoadState<TopicsScreenData>> {
  const supabase = await createServerSupabaseClient();

  const { data: topics, error } = await supabase
    .from("v_thread_detail")
    .select("*")
    .order("thread_score", { ascending: false })
    .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: { topics: [] }, error: error.message };
  }

  return {
    data: {
      topics: (topics ?? []).map((topic) => ({
        ...toTopicSummary(topic as Record<string, unknown> & { id: string; slug: string; title: string; topic_status: string; effective_visibility: string; open_at: string; close_at: string; created_at: string }),
        aggregate: toTopicAggregate(topic as Record<string, unknown> & { id: string; prediction_type?: string | null }) as TopicPredictionAggregateView | null
      }))
    },
    error: null
  };
}

export async function getTopicDetail(slug: string): Promise<TopicDetailScreenData | null> {
  const supabase = await createServerSupabaseClient();

  const { data: topic, error } = await supabase
    .from("v_thread_detail")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!topic) {
    return null;
  }

  const [{ data: question }, { data: options }, { data: threadPosts, error: threadPostsError }] =
    await Promise.all([
      supabase
        .from("prediction_question")
        .select("topic_id, prediction_type, title, unit_label, allow_submission_update")
        .eq("topic_id", topic.id)
        .maybeSingle(),
      supabase
        .from("prediction_option")
        .select("id, topic_id, slug, label, sort_order, is_active")
        .eq("topic_id", topic.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("v_thread_posts")
        .select("id, thread_id, type, title, content, created_at")
        .eq("thread_id", topic.id)
        .order("created_at", { ascending: false })
    ]);

  if (threadPostsError) {
    throw threadPostsError;
  }

  let posts = (threadPosts ?? []).map((post) =>
    toThreadPost(post as Record<string, unknown> & { id: string; thread_id: string; type: string; created_at: string })
  );

  if (!posts.length) {
    const { data: legacyPosts, error: legacyPostsError } = await supabase
      .from("post")
      .select("id, topic_id, space_id, post_type, post_status, title, body_markdown, created_at")
      .eq("topic_id", topic.id)
      .eq("post_status", "visible")
      .order("created_at", { ascending: false });

    if (legacyPostsError) {
      throw legacyPostsError;
    }

    posts = (legacyPosts ?? []).map((post) =>
      toLegacyPost(post as Record<string, unknown> & {
        id: string;
        topic_id: string | null;
        space_id: string | null;
        post_type: string;
        post_status: string;
        body_markdown: string;
        created_at: string;
      })
    );
  }

  return {
    topic: toTopicRow(topic as Record<string, unknown> & { id: string; slug: string; title: string; topic_status: string; effective_visibility: string; open_at: string; close_at: string; created_at: string }),
    question: toPredictionQuestion(question as Record<string, unknown> | null),
    options: (options ?? []) as PredictionOptionRow[],
    posts,
    aggregate: toTopicAggregate(topic as Record<string, unknown> & { id: string; prediction_type?: string | null }) as TopicPredictionAggregateView | null
  };
}

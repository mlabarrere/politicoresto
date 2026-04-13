import type { LoadState, ThreadDetailScreenData, ThreadsScreenData } from "@/lib/types/screens";
import type {
  PollOptionRow,
  PollQuestionRow,
  PollRow,
  PredictionOptionRow,
  PublicPollResultsView,
  ThreadPredictionAggregateView
} from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  toLegacyPost,
  toPredictionQuestion,
  toThreadPost,
  toThreadAggregate,
  toThreadRow,
  toThreadSummary
} from "./canonical";
import { getEntityLeaderboard } from "./leaderboards";

export async function getThreadsScreenData(): Promise<LoadState<ThreadsScreenData>> {
  const supabase = await createServerSupabaseClient();

  const { data: topics, error } = await supabase
    .from("v_thread_detail")
    .select("*")
    .order("thread_score", { ascending: false })
    .order("latest_thread_post_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: { threads: [] }, error: error.message };
  }

  return {
    data: {
      threads: (topics ?? []).map((topic) => ({
        ...toThreadSummary(topic as Record<string, unknown> & { id: string; slug: string; title: string; topic_status: string; effective_visibility: string; open_at: string; close_at: string; created_at: string }),
        aggregate: toThreadAggregate(topic as Record<string, unknown> & { id: string; prediction_type?: string | null }) as ThreadPredictionAggregateView | null
      }))
    },
    error: null
  };
}

export async function getThreadDetail(slug: string): Promise<ThreadDetailScreenData | null> {
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

  const [
    { data: question },
    { data: options },
    { data: threadPosts, error: threadPostsError },
    { data: comments, error: commentsError },
    { data: polls, error: pollsError },
    { data: relatedTopics, error: relatedTopicsError },
    localLeaderboard
  ] =
    await Promise.all([
      supabase
        .from("prediction_question")
        .select("topic_id, prediction_type, title, unit_label, allow_submission_update, min_numeric_value, max_numeric_value, min_date_value, max_date_value, ordinal_min, ordinal_max, thread_post_id")
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
        .order("created_at", { ascending: true }),
      supabase
        .from("v_post_comments")
        .select("*")
        .eq("thread_id", topic.id)
        .order("comment_score", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("poll")
        .select("id, topic_id, space_id, title, description, poll_status, visibility, open_at, close_at, thread_post_id")
        .eq("topic_id", topic.id)
        .order("created_at", { ascending: true }),
      topic.entity_id
        ? supabase
            .from("v_feed_entity")
            .select("*")
            .eq("entity_id", topic.entity_id)
            .neq("topic_id", topic.id)
            .order("thread_score", { ascending: false })
            .limit(4)
        : Promise.resolve({ data: [], error: null }),
      topic.entity_id ? getEntityLeaderboard(topic.entity_id, 5) : Promise.resolve([])
    ]);

  if (threadPostsError) {
    throw threadPostsError;
  }
  if (commentsError) {
    throw commentsError;
  }
  if (pollsError) {
    throw pollsError;
  }
  if (relatedTopicsError) {
    throw relatedTopicsError;
  }

  const pollIds = (polls ?? []).map((poll) => poll.id);
  const pollQuestionsResult = pollIds.length
    ? await supabase
        .from("poll_question")
        .select("id, poll_id, prompt, question_type, sort_order")
        .in("poll_id", pollIds)
        .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (pollQuestionsResult.error) throw pollQuestionsResult.error;

  const pollQuestionIds = (pollQuestionsResult.data ?? []).map((row) => row.id);
  const [pollOptionsResult, pollResultsResult] = await Promise.all([
    pollQuestionIds.length
      ? supabase
          .from("poll_option")
          .select("id, poll_question_id, label, sort_order")
          .in("poll_question_id", pollQuestionIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    pollIds.length
      ? supabase.from("v_poll_public_results").select("*").in("poll_id", pollIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (pollOptionsResult.error) throw pollOptionsResult.error;
  if (pollResultsResult.error) throw pollResultsResult.error;

  const mappedThreadPosts = (threadPosts ?? []).map((post) =>
    toThreadPost(post as Record<string, unknown> & { id: string; thread_id: string; type: string; created_at: string })
  );
  let posts = mappedThreadPosts;

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
    thread: toThreadRow(topic as Record<string, unknown> & { id: string; slug: string; title: string; topic_status: string; effective_visibility: string; open_at: string; close_at: string; created_at: string }),
    question: toPredictionQuestion(question as Record<string, unknown> | null),
    options: (options ?? []) as PredictionOptionRow[],
    polls: (polls ?? []).map((poll) => {
      const pollRow: PollRow = {
        id: String(poll.id),
        topic_id: (poll.topic_id as string | null) ?? null,
        space_id: (poll.space_id as string | null) ?? null,
        title: String(poll.title),
        description: (poll.description as string | null) ?? null,
        poll_status: String(poll.poll_status),
        visibility: String(poll.visibility),
        open_at: String(poll.open_at),
        close_at: String(poll.close_at)
      };

      const questions = (pollQuestionsResult.data ?? [])
        .filter((questionRow) => questionRow.poll_id === poll.id)
        .map((questionRow) => {
          const mappedQuestion: PollQuestionRow = {
            id: String(questionRow.id),
            poll_id: String(questionRow.poll_id),
            prompt: String(questionRow.prompt),
            question_type: String(questionRow.question_type),
            sort_order: Number(questionRow.sort_order)
          };

          const options = (pollOptionsResult.data ?? [])
            .filter((optionRow) => optionRow.poll_question_id === questionRow.id)
            .map(
              (optionRow): PollOptionRow => ({
                id: String(optionRow.id),
                poll_question_id: String(optionRow.poll_question_id),
                label: String(optionRow.label),
                sort_order: Number(optionRow.sort_order)
              })
            );

          const results = (pollResultsResult.data ?? [])
            .filter((resultRow) => resultRow.poll_question_id === questionRow.id)
            .map(
              (resultRow): PublicPollResultsView => ({
                poll_id: String(resultRow.poll_id),
                poll_question_id: String(resultRow.poll_question_id),
                poll_option_id: (resultRow.poll_option_id as string | null) ?? null,
                option_label: (resultRow.option_label as string | null) ?? null,
                response_count: Number(resultRow.response_count ?? 0)
              })
            );

          return {
            ...mappedQuestion,
            options,
            results
          };
        });

      return {
        ...pollRow,
        questions
      };
    }),
    posts,
    threadPosts: (threadPosts ?? []) as ThreadDetailScreenData["threadPosts"],
    comments: (comments ?? []) as ThreadDetailScreenData["comments"],
    localLeaderboard,
    relatedThreads: (relatedTopics ?? []).map((item) =>
      toThreadSummary({
        ...(item as Record<string, unknown>),
        id: String((item as Record<string, unknown>).topic_id),
        space_id: ((item as Record<string, unknown>).space_id as string | null) ?? null,
        slug: String((item as Record<string, unknown>).topic_slug),
        title: String((item as Record<string, unknown>).topic_title),
        description: ((item as Record<string, unknown>).topic_description as string | null) ?? null,
        topic_status: String((item as Record<string, unknown>).topic_status),
        effective_visibility: String((item as Record<string, unknown>).visibility ?? "public"),
        primary_territory_id: ((item as Record<string, unknown>).primary_territory_id as string | null) ?? null,
        open_at: String((item as Record<string, unknown>).open_at),
        close_at: String((item as Record<string, unknown>).close_at),
        created_at: String((item as Record<string, unknown>).created_at)
      })
    ),
    aggregate: toThreadAggregate(topic as Record<string, unknown> & { id: string; prediction_type?: string | null }) as ThreadPredictionAggregateView | null
  };
}

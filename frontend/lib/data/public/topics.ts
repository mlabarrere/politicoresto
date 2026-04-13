import type { LoadState, TopicDetailScreenData, TopicsScreenData } from "@/lib/types/screens";
import type {
  PredictionOptionRow,
  TopicPredictionAggregateView
} from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getEditorialTopicSelect,
  toPosts,
  toPredictionQuestion,
  toTopicAggregate,
  toTopicRow,
  toTopicSummary,
  type EditorialTopicRow
} from "./editorial";

export async function getTopicsScreenData(): Promise<LoadState<TopicsScreenData>> {
  const supabase = await createServerSupabaseClient();

  const { data: topics, error } = await supabase
    .from("topics_editorial")
    .select(getEditorialTopicSelect())
    .order("editorial_priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: { topics: [] }, error: error.message };
  }

  return {
    data: {
      topics: ((topics ?? []) as unknown as EditorialTopicRow[]).map((topic) => ({
        ...toTopicSummary(topic),
        aggregate: toTopicAggregate(topic)
      }))
    },
    error: null
  };
}

export async function getTopicDetail(slug: string): Promise<TopicDetailScreenData | null> {
  const supabase = await createServerSupabaseClient();

  const { data: topic, error } = await supabase
    .from("topics_editorial")
    .select(getEditorialTopicSelect())
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!topic) {
    return null;
  }

  return {
    topic: toTopicRow(topic as unknown as EditorialTopicRow),
    question: toPredictionQuestion(topic as unknown as EditorialTopicRow),
    options: [] as PredictionOptionRow[],
    posts: toPosts(topic as unknown as EditorialTopicRow),
    aggregate: toTopicAggregate(topic as unknown as EditorialTopicRow) as TopicPredictionAggregateView | null
  };
}

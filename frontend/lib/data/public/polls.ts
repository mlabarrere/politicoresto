import type { PollDetailScreenData } from "@/lib/types/screens";
import type {
  PollOptionRow,
  PollQuestionRow,
  PollRow,
  PublicPollResultsView
} from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPollDetail(id: string): Promise<PollDetailScreenData | null> {
  const supabase = await createServerSupabaseClient();

  const { data: poll, error } = await supabase
    .from("poll")
    .select("id, topic_id, space_id, title, description, poll_status, visibility, open_at, close_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!poll) {
    return null;
  }

  const { data: questions, error: questionsError } = await supabase
    .from("poll_question")
    .select("id, poll_id, prompt, question_type, sort_order")
    .eq("poll_id", poll.id)
    .order("sort_order", { ascending: true });

  if (questionsError) {
    throw questionsError;
  }

  const questionRows = (questions ?? []) as PollQuestionRow[];

  const questionIds = questionRows.map((question) => question.id);

  const [optionsResult, resultsResult] = await Promise.all([
    questionIds.length
      ? supabase
          .from("poll_option")
          .select("id, poll_question_id, label, sort_order")
          .in("poll_question_id", questionIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("v_poll_public_results").select("*").eq("poll_id", poll.id)
  ]);

  if (optionsResult.error) throw optionsResult.error;
  if (resultsResult.error) throw resultsResult.error;

  const options = (optionsResult.data ?? []) as PollOptionRow[];
  const results = (resultsResult.data ?? []) as PublicPollResultsView[];

  return {
    poll: poll as PollRow,
    questions: questionRows.map((question) => ({
      ...question,
      options: options.filter((option) => option.poll_question_id === question.id),
      results: results.filter((result) => result.poll_question_id === question.id)
    }))
  };
}

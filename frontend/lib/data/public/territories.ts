import type { LoadState, TerritoriesScreenData } from "@/lib/types/screens";
import type {
  TerritoryPredictionRollupView,
  TerritoryTopicRollupView
} from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getTerritoriesScreenData(): Promise<LoadState<TerritoriesScreenData>> {
  const supabase = await createServerSupabaseClient();

  const [topicRollups, predictionRollups] = await Promise.all([
    supabase
      .from("v_territory_rollup_topic_count")
      .select("*")
      .order("topic_count", { ascending: false }),
    supabase
      .from("territory_prediction_rollup_cache")
      .select("*")
      .order("prediction_count", { ascending: false })
  ]);

  const errors = [topicRollups.error, predictionRollups.error]
    .filter(Boolean)
    .map((error) => error?.message);

  return {
    data: {
      topicRollups: (topicRollups.data ?? []) as TerritoryTopicRollupView[],
      predictionRollups: (predictionRollups.data ?? []) as TerritoryPredictionRollupView[]
    },
    error: errors.length ? errors.join(" | ") : null
  };
}

import type { LoadState, SpacesScreenData } from "@/lib/types/screens";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getEditorialTopicSelect,
  toSpace,
  toTopicSummary,
  type EditorialThemeRow,
  type EditorialTopicRow
} from "./editorial";

export async function getSpacesScreenData(): Promise<LoadState<SpacesScreenData>> {
  const supabase = await createServerSupabaseClient();

  const [spacesResult, topicsResult] = await Promise.all([
    supabase
      .from("themes")
      .select("id, slug, name, description, priority_rank, is_active, created_at")
      .eq("is_active", true)
      .order("priority_rank", { ascending: true }),
    supabase
      .from("topics_editorial")
      .select(getEditorialTopicSelect())
      .order("editorial_priority", { ascending: false })
      .limit(8)
  ]);

  const errors = [spacesResult.error, topicsResult.error]
    .filter(Boolean)
    .map((error) => error?.message);

  return {
    data: {
      spaces: ((spacesResult.data ?? []) as EditorialThemeRow[]).map(toSpace),
      highlightedTopics: ((topicsResult.data ?? []) as unknown as EditorialTopicRow[]).map(toTopicSummary)
    },
    error: errors.length ? errors.join(" | ") : null
  };
}

export async function getSpaceDetail(slug: string) {
  const supabase = await createServerSupabaseClient();

  const { data: space, error } = await supabase
    .from("themes")
    .select("id, slug, name, description, priority_rank, is_active, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!space) {
    return null;
  }

  const { data: subthemes, error: subthemesError } = await supabase
    .from("subthemes")
    .select("id")
    .eq("theme_id", space.id);

  if (subthemesError) {
    throw subthemesError;
  }

  const subthemeIds = (subthemes ?? []).map((subtheme) => subtheme.id);
  const { data: topics, error: topicsError } = subthemeIds.length
    ? await supabase
        .from("topics_editorial")
        .select(getEditorialTopicSelect())
        .in("subtheme_id", subthemeIds)
        .order("editorial_priority", { ascending: false })
    : { data: [], error: null };

  if (topicsError) {
    throw topicsError;
  }

  return {
    space: toSpace(space as EditorialThemeRow),
    topics: ((topics ?? []) as unknown as EditorialTopicRow[]).map(toTopicSummary)
  };
}

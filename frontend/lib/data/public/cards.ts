import type { CardsScreenData, LoadState } from "@/lib/types/screens";
import type { CardCatalogRow, PublicCardShowcaseView } from "@/lib/types/views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCardsScreenData(): Promise<LoadState<CardsScreenData>> {
  const supabase = await createServerSupabaseClient();

  const [catalogResult, showcaseResult] = await Promise.all([
    supabase
      .from("card_catalog")
      .select("*")
      .eq("is_active", true)
      .order("label", { ascending: true }),
    supabase
      .from("v_public_user_card_showcase")
      .select("*")
      .limit(12)
  ]);

  const errors = [catalogResult.error, showcaseResult.error]
    .filter(Boolean)
    .map((error) => error?.message);

  return {
    data: {
      catalog: (catalogResult.data ?? []) as CardCatalogRow[],
      showcase: (showcaseResult.data ?? []) as PublicCardShowcaseView[]
    },
    error: errors.length ? errors.join(" | ") : null
  };
}

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";
import type { HomeScreenData } from "@/lib/types/screens";
import { getHomeScreenData } from "@/lib/data/public/home";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { buildHomeFeedTopic } from "../fixtures/home-feed-topic";

vi.mock("@/lib/data/public/home", () => ({
  getHomeScreenData: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

const mockedGetHomeScreenData = vi.mocked(getHomeScreenData);
const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

function makeHomeScreenData(overrides: Partial<HomeScreenData> = {}): HomeScreenData {
  const feed = [
    buildHomeFeedTopic(),
    buildHomeFeedTopic({
      topic_id: "topic-2",
      topic_slug: "declaration-programmatique",
      topic_title: "A quelle date la declaration commune sera-t-elle publiee ?",
      derived_lifecycle_state: "pending_resolution",
      feed_reason_code: "pending_resolution",
      feed_reason_label: "Remonte car la resolution est attendue",
      topic_card_payload: {
        topic_id: "topic-2",
        topic_slug: "declaration-programmatique",
        topic_title: "A quelle date la declaration commune sera-t-elle publiee ?",
        derived_lifecycle_state: "pending_resolution",
        feed_reason_code: "pending_resolution",
        feed_reason_label: "Remonte car la resolution est attendue"
      }
    }),
    buildHomeFeedTopic({
      topic_id: "topic-3",
      topic_slug: "motion-censure",
      topic_title: "Une motion de censure aboutira-t-elle ?",
      feed_reason_code: "high_activity",
      feed_reason_label: "Remonte car l'activite se concentre ici",
      topic_card_payload: {
        topic_id: "topic-3",
        topic_slug: "motion-censure",
        topic_title: "Une motion de censure aboutira-t-elle ?",
        feed_reason_code: "high_activity",
        feed_reason_label: "Remonte car l'activite se concentre ici"
      }
    })
  ];

  return {
    feed,
    leaderboard: [],
    selectedBloc: null,
    ...overrides
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    mockedGetHomeScreenData.mockReset();
    mockedCreateServerSupabaseClient.mockReset();
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null }
        })
      }
    } as never);
  });

  it("renders the feed homepage with canonical data", async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData(),
      error: null
    });

    render(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Feed presidentiel actif")).toBeInTheDocument();
    expect(screen.getByText("Blocs")).toBeInTheDocument();
    expect(screen.getByText("Gauche radicale a gauche")).toBeInTheDocument();
  });

  it("renders an empty state when the feed is empty", async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData({
        feed: [],
        leaderboard: []
      }),
      error: null
    });

    render(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Aucun thread visible")).toBeInTheDocument();
  });

  it("renders an unavailable state when the feed query fails", async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData(),
      error: "relation public.thread_feed_cache does not exist"
    });

    render(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Feed partiel")).toBeInTheDocument();
    expect(screen.getByText(/thread_feed_cache/)).toBeInTheDocument();
  });
});

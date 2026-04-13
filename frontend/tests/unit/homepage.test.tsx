import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";
import type { HomeScreenData } from "@/lib/types/screens";
import { getHomeScreenData } from "@/lib/data/public/home";

import { buildHomeFeedTopic } from "../fixtures/home-feed-topic";

vi.mock("@/lib/data/public/home", () => ({
  getHomeScreenData: vi.fn()
}));

const mockedGetHomeScreenData = vi.mocked(getHomeScreenData);

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
    watchlist: [feed[1]],
    cards: [feed[0]],
    territories: [feed[0]],
    ...overrides
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    mockedGetHomeScreenData.mockReset();
  });

  it("renders the editorial homepage with feed data", async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData(),
      error: null
    });

    render(await HomePage());

    expect(
      screen.getByText("Suivez la presidentielle comme un jeu de conversation.")
    ).toBeInTheDocument();
    expect(screen.getByText("A surveiller")).toBeInTheDocument();
    expect(screen.getByText("Cartes a debloquer")).toBeInTheDocument();
    expect(screen.getByText("Derniers resultats")).toBeInTheDocument();
    expect(screen.getByText("Familles visibles")).toBeInTheDocument();
    expect(screen.getByText("Espaces en vue")).toBeInTheDocument();
  });

  it("renders an empty state when the feed is empty", async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData({
        feed: [],
        watchlist: [],
        cards: [],
        territories: []
      }),
      error: null
    });

    render(await HomePage());

    expect(screen.getByText("Les sujets arrivent")).toBeInTheDocument();
  });

  it("renders an unavailable state when the feed query fails", async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData(),
      error: "relation public.home_feed_topic_cache does not exist"
    });

    render(await HomePage());

    expect(screen.getByText("Le flux principal est partiellement disponible")).toBeInTheDocument();
    expect(screen.getByText(/home_feed_topic_cache/)).toBeInTheDocument();
  });
});

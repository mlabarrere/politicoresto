import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomePage from '@/app/page';
import type { HomeScreenData } from '@/lib/types/screens';
import { getHomeScreenData } from '@/lib/data/public/home';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { buildHomeFeedTopic } from '../fixtures/home-feed-topic';

vi.mock('@/lib/data/public/home', () => ({
  getHomeScreenData: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockedGetHomeScreenData = vi.mocked(getHomeScreenData);
const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

function makeHomeScreenData(
  overrides: Partial<HomeScreenData> = {},
): HomeScreenData {
  const feed = [
    buildHomeFeedTopic(),
    buildHomeFeedTopic({
      topic_id: 'topic-2',
      topic_slug: 'reforme-transport-region',
      topic_title: 'La region doit accelerer la modernisation des transports',
      feed_reason_code: 'high_activity',
      feed_reason_label: "Remonte car l'activite se concentre ici",
      topic_card_payload: {
        topic_id: 'topic-2',
        topic_slug: 'reforme-transport-region',
        topic_title: 'La region doit accelerer la modernisation des transports',
        feed_reason_code: 'high_activity',
        feed_reason_label: "Remonte car l'activite se concentre ici",
      },
    }),
    buildHomeFeedTopic({
      topic_id: 'topic-3',
      topic_slug: 'justice-proximite-prioritaire',
      topic_title: 'La justice de proximite doit redevenir prioritaire',
      feed_reason_code: 'high_activity',
      feed_reason_label: "Remonte car l'activite se concentre ici",
      topic_card_payload: {
        topic_id: 'topic-3',
        topic_slug: 'justice-proximite-prioritaire',
        topic_title: 'La justice de proximite doit redevenir prioritaire',
        feed_reason_code: 'high_activity',
        feed_reason_label: "Remonte car l'activite se concentre ici",
      },
    }),
  ];

  return {
    feed,
    subjects: [],
    ...overrides,
  };
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedGetHomeScreenData.mockReset();
    mockedCreateServerSupabaseClient.mockReset();
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    } as never);
  });

  it('renders the feed homepage with canonical data', async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData(),
      error: null,
    });

    render(await HomePage());

    expect(screen.getAllByText('Partis').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/LFI/).length).toBeGreaterThan(0);
  });

  it('renders an empty state when the feed is empty', async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData({
        feed: [],
      }),
      error: null,
    });

    render(await HomePage());

    expect(screen.getByText('Aucun post visible')).toBeInTheDocument();
  });

  it('does not expose technical feed errors in UI', async () => {
    mockedGetHomeScreenData.mockResolvedValue({
      data: makeHomeScreenData(),
      error: 'relation public.v_feed_global does not exist',
    });

    render(await HomePage());

    expect(screen.queryByText('Feed partiel')).not.toBeInTheDocument();
    expect(screen.queryByText(/v_feed_global/)).not.toBeInTheDocument();
  });
});

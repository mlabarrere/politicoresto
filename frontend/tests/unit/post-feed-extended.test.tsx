import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PostFeed } from '@/components/home/post-feed';
import { buildHomeFeedTopic } from '@/tests/fixtures/home-feed-topic';

// Mock AppFeedItem to avoid deep rendering
vi.mock('@/components/app/app-feed-item', () => ({
  AppFeedItem: ({
    item,
  }: {
    item: { topic_id: string; topic_title: string };
  }) => (
    <div data-testid={`feed-item-${item.topic_id}`}>{item.topic_title}</div>
  ),
}));

describe('PostFeed', () => {
  it('shows empty state when no items', () => {
    render(<PostFeed items={[]} isAuthenticated={false} sortMode="popular" />);
    expect(screen.getByText('Aucun post visible')).toBeTruthy();
  });

  it('shows empty state when filter leaves no items', () => {
    const items = [buildHomeFeedTopic({ feed_poll_summary: undefined })];
    render(
      <PostFeed
        items={items}
        isAuthenticated={false}
        sortMode="popular"
        categoryFilter={{ type: 'sondage', status: 'open' }}
      />,
    );
    // no poll items → empty state
    expect(screen.queryByTestId(/feed-item-/)).toBeNull();
  });

  it('renders all items when no filter', () => {
    const items = [
      buildHomeFeedTopic({ topic_id: 't1', topic_title: 'Post A' }),
      buildHomeFeedTopic({ topic_id: 't2', topic_title: 'Post B' }),
    ];
    render(
      <PostFeed items={items} isAuthenticated={false} sortMode="popular" />,
    );
    expect(screen.getByTestId('feed-item-t1')).toBeTruthy();
    expect(screen.getByTestId('feed-item-t2')).toBeTruthy();
  });

  it('filters sondage open correctly', () => {
    const withPoll = buildHomeFeedTopic({
      topic_id: 't1',
      feed_poll_summary: {
        post_item_id: 'pi1',
        post_id: 'p1',
        post_slug: 's1',
        post_title: 'T',
        question: 'Q?',
        deadline_at: '2026-12-31',
        poll_status: 'open',
        sample_size: 10,
        effective_sample_size: 10,
        representativity_score: 1,
        coverage_score: 1,
        distance_score: 1,
        stability_score: 1,
        anti_brigading_score: 1,
        raw_results: [],
        corrected_results: [],
        options: [],
        selected_option_id: null,
      },
    });
    const withoutPoll = buildHomeFeedTopic({
      topic_id: 't2',
      feed_poll_summary: undefined,
    });

    render(
      <PostFeed
        items={[withPoll, withoutPoll]}
        isAuthenticated={false}
        sortMode="popular"
        categoryFilter={{ type: 'sondage', status: 'open' }}
      />,
    );
    expect(screen.getByTestId('feed-item-t1')).toBeTruthy();
    expect(screen.queryByTestId('feed-item-t2')).toBeNull();
  });

  it('filters politique by bloc slug', () => {
    const lfiItem = buildHomeFeedTopic({
      topic_id: 't1',
      primary_taxonomy_slug: 'lfi',
    });
    const rnItem = buildHomeFeedTopic({
      topic_id: 't2',
      primary_taxonomy_slug: 'rn',
    });

    render(
      <PostFeed
        items={[lfiItem, rnItem]}
        isAuthenticated={false}
        sortMode="popular"
        categoryFilter={{ type: 'politique', blocSlug: 'gauche-radicale' }}
      />,
    );
    expect(screen.getByTestId('feed-item-t1')).toBeTruthy();
    expect(screen.queryByTestId('feed-item-t2')).toBeNull();
  });

  it('shows load more button when more items available', () => {
    // Create 21 items (> INITIAL_VISIBLE_ITEMS = 20)
    const items = Array.from({ length: 21 }, (_, i) =>
      buildHomeFeedTopic({ topic_id: `t${i}`, topic_title: `Post ${i}` }),
    );
    render(
      <PostFeed items={items} isAuthenticated={false} sortMode="popular" />,
    );
    expect(screen.getByText('Charger plus')).toBeTruthy();
  });

  it('loads more items on button click', () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      buildHomeFeedTopic({ topic_id: `t${i}`, topic_title: `Post ${i}` }),
    );
    render(
      <PostFeed items={items} isAuthenticated={false} sortMode="popular" />,
    );
    const loadMoreBtn = screen.getByText('Charger plus');
    fireEvent.click(loadMoreBtn);
    // After clicking, 30 items visible (still 25 items, capped at 30)
    const renderedItems = screen.queryAllByTestId(/feed-item-/);
    expect(renderedItems.length).toBe(25);
  });

  it('sorts by recent when sortMode=recent', () => {
    const older = buildHomeFeedTopic({
      topic_id: 't-old',
      last_activity_at: '2026-01-01T00:00:00Z',
    });
    const newer = buildHomeFeedTopic({
      topic_id: 't-new',
      last_activity_at: '2026-04-01T00:00:00Z',
    });

    render(
      <PostFeed
        items={[older, newer]}
        isAuthenticated={false}
        sortMode="recent"
      />,
    );
    const rendered = screen.queryAllByTestId(/feed-item-/);
    // Newer should come first
    expect(rendered[0]!.getAttribute('data-testid')).toBe('feed-item-t-new');
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostCard } from '@/components/domain/post-card';
import { buildHomeFeedTopic } from '../fixtures/home-feed-topic';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('post feed card', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('truncates preview at 500 chars with ellipsis', () => {
    const longBody = `${'A'.repeat(520)} fin`;
    render(
      <PostCard
        item={buildHomeFeedTopic({
          feed_post_id: 'post-1',
          feed_post_content: longBody,
        })}
        isAuthenticated
      />,
    );

    const preview = screen.getByText((text) => text.startsWith('A'));
    expect(preview.textContent.length).toBe(503);
    expect(preview.textContent.endsWith('...')).toBe(true);
  });

  it('opens post when card is clicked', () => {
    render(
      <PostCard
        item={buildHomeFeedTopic({
          topic_slug: 'thread-x',
          feed_post_id: 'post-1',
          feed_post_content: 'Contenu court',
        })}
        isAuthenticated
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: /ouvrir le post/i }));
    expect(pushMock).toHaveBeenCalledWith('/post/thread-x');
  });

  it('does not trigger card navigation when action buttons are clicked', () => {
    render(
      <PostCard
        item={buildHomeFeedTopic({
          feed_post_id: 'post-1',
          feed_post_content: 'Contenu court',
        })}
        isAuthenticated
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows comment count and political reactions, and no super like', () => {
    render(
      <PostCard
        item={buildHomeFeedTopic({
          feed_post_id: 'post-1',
          feed_post_content: 'Contenu court',
          feed_comment_count: 12,
        })}
        isAuthenticated
      />,
    );

    expect(screen.getByText(/12 commentaires/i)).toBeInTheDocument();
    expect(screen.getByLabelText("C'est de gauche !")).toBeInTheDocument();
    expect(screen.getByLabelText("C'est de droite !")).toBeInTheDocument();
    expect(screen.queryByText(/super like/i)).not.toBeInTheDocument();
  });

  it('shares by copying thread URL when navigator.share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });

    render(
      <PostCard
        item={buildHomeFeedTopic({
          topic_slug: 'share-thread',
          feed_post_id: 'post-1',
          feed_post_content: 'Contenu court',
        })}
        isAuthenticated
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));

    await waitFor(() =>
      { expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('/post/share-thread'),
      ); },
    );
  });
});

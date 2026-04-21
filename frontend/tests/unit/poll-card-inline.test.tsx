import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PollCardInline } from '@/components/poll/poll-card-inline';
import { buildPollSummary } from '../fixtures/polls';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

describe('poll card inline', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('shows voting options before answer', () => {
    render(<PollCardInline poll={buildPollSummary()} isAuthenticated={true} />);
    expect(screen.getByText('Sondage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sante' })).toBeInTheDocument();
    expect(screen.queryByText(/Resultats/i)).not.toBeInTheDocument();
  });

  it('switches to results after vote', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        poll: buildPollSummary({
          selected_option_id: 'o1',
          sample_size: 43,
        }),
      }),
    });

    render(<PollCardInline poll={buildPollSummary()} isAuthenticated={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sante' }));

    await waitFor(() =>
      expect(screen.getByText('Resultats')).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/polls/vote',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows login hint for guests', () => {
    render(
      <PollCardInline poll={buildPollSummary()} isAuthenticated={false} />,
    );
    expect(screen.getByText(/Connectez-vous/i)).toBeInTheDocument();
  });

  it('renders closed state with results and no vote buttons', () => {
    render(
      <PollCardInline
        poll={buildPollSummary({
          poll_status: 'closed',
          selected_option_id: 'o1',
        })}
        isAuthenticated={true}
      />,
    );

    expect(screen.getByText(/Sondage clos/i)).toBeInTheDocument();
    expect(screen.getByText('Resultats')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sante' }),
    ).not.toBeInTheDocument();
  });

  it('updates sample size after server response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        poll: buildPollSummary({
          selected_option_id: 'o2',
          sample_size: 121,
        }),
      }),
    });

    render(<PollCardInline poll={buildPollSummary()} isAuthenticated={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sante' }));

    await waitFor(() =>
      expect(screen.getByText(/121 votes/i)).toBeInTheDocument(),
    );
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppVoteHistoryEditor } from '@/components/app/app-vote-history-editor';
import type {
  ElectionRow,
  UserVoteRow,
} from '@/lib/data/authenticated/vote-history';

const upsertMock = vi.fn(async (_input: unknown) => undefined);
const deleteMock = vi.fn(async (_slug: string) => undefined);

vi.mock('@/lib/actions/vote-history', () => ({
  upsertVoteHistoryAction: (input: unknown) => upsertMock(input),
  deleteVoteHistoryAction: (slug: string) => deleteMock(slug),
}));

const baseElection: ElectionRow = {
  id: 'el-1',
  slug: 'presidentielle-2022-t1',
  type: 'presidentielle',
  year: 2022,
  round: 1,
  held_on: '2022-04-10',
  label: 'Presidentielle 2022 - 1er tour',
  results: [
    {
      id: 'r-macron',
      rank: 1,
      candidate_name: 'Emmanuel Macron',
      list_label: null,
      party_slug: 'renaissance',
      nuance: 'ENS',
      pct_exprimes: 27.85,
    },
    {
      id: 'r-lepen',
      rank: 2,
      candidate_name: 'Marine Le Pen',
      list_label: null,
      party_slug: 'rn',
      nuance: 'RN',
      pct_exprimes: 23.15,
    },
  ],
};

afterEach(() => {
  upsertMock.mockClear();
  deleteMock.mockClear();
});

describe('appVoteHistoryEditor', () => {
  it('shows the unavailable state when status is unavailable', () => {
    render(
      <AppVoteHistoryEditor
        elections={[]}
        votesByElectionId={{}}
        status="unavailable"
        message="Hors service"
      />,
    );
    expect(screen.getByText('Historique electoral indisponible')).toBeTruthy();
    expect(screen.getByText('Hors service')).toBeTruthy();
  });

  it('renders a grid of candidate tiles for each election', () => {
    render(
      <AppVoteHistoryEditor
        elections={[baseElection]}
        votesByElectionId={{}}
      />,
    );
    expect(screen.getByText(/Presidentielle 2022/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Emmanuel Macron/i }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /Marine Le Pen/i })).toBeTruthy();
    // Abstention tiles present
    expect(screen.getByRole('button', { name: /Vote blanc/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Abstention/i })).toBeTruthy();
  });

  it('calls upsert action when clicking an unselected candidate tile', () => {
    render(
      <AppVoteHistoryEditor
        elections={[baseElection]}
        votesByElectionId={{}}
      />,
    );
    const tile = screen.getByRole('button', { name: /Emmanuel Macron/i });
    fireEvent.click(tile);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        election_slug: 'presidentielle-2022-t1',
        election_result_id: 'r-macron',
        choice_kind: 'vote',
      }),
    );
  });

  it('calls delete action when clicking the already selected tile', () => {
    const selectedVote: UserVoteRow = {
      id: 'v-1',
      election_id: 'el-1',
      election_slug: 'presidentielle-2022-t1',
      election_label: 'Presidentielle 2022 - 1er tour',
      election_result_id: 'r-macron',
      choice_kind: 'vote',
      declared_at: '2026-04-20T00:00:00Z',
      candidate_name: 'Emmanuel Macron',
      list_label: null,
      party_slug: 'renaissance',
    };
    render(
      <AppVoteHistoryEditor
        elections={[baseElection]}
        votesByElectionId={{ 'el-1': selectedVote }}
      />,
    );
    const tile = screen.getByRole('button', {
      name: /Emmanuel Macron.*selectionne/i,
    });
    expect(tile.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(tile);
    expect(deleteMock).toHaveBeenCalledWith('presidentielle-2022-t1');
  });

  it('renders the full list label with accents and balanced parentheses (no truncation)', () => {
    const longLabelElection: ElectionRow = {
      ...baseElection,
      id: 'el-2',
      slug: 'legislatives-2022-t1',
      results: [
        {
          id: 'r-ensemble',
          rank: 1,
          candidate_name: null,
          list_label: 'Ensemble pour la République (E. présidentielle)',
          party_slug: 'renaissance',
          nuance: 'ENS',
          pct_exprimes: 24.7,
        },
      ],
    };
    render(
      <AppVoteHistoryEditor
        elections={[longLabelElection]}
        votesByElectionId={{}}
      />,
    );
    const tile = screen.getByRole('button', {
      name: /Ensemble pour la République/,
    });
    // Full label present verbatim — accents intact, parens balanced.
    expect(tile.textContent).toContain(
      'Ensemble pour la République (E. présidentielle)',
    );
    // Negative: the historical truncation bug produced dangling `)`.
    const parensText = tile.textContent ?? '';
    const opens = (parensText.match(/\(/g) ?? []).length;
    const closes = (parensText.match(/\)/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it('optimistically flips aria-pressed on click before the action resolves', async () => {
    const pending: { resolve: (() => void) | null } = { resolve: null };
    upsertMock.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          pending.resolve = () => {
            resolve(undefined);
          };
        }),
    );
    render(
      <AppVoteHistoryEditor
        elections={[baseElection]}
        votesByElectionId={{}}
      />,
    );
    const tile = screen.getByRole('button', { name: /Emmanuel Macron/i });
    expect(tile.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(tile);
    // The action has NOT resolved yet — the optimistic update must already
    // show the tile as pressed.
    await Promise.resolve();
    const pressedTile = screen.getByRole('button', {
      name: /Emmanuel Macron.*selectionne/i,
    });
    expect(pressedTile.getAttribute('aria-pressed')).toBe('true');
    pending.resolve?.();
  });

  it('records abstention via upsert when clicking the Blanc tile', () => {
    render(
      <AppVoteHistoryEditor
        elections={[baseElection]}
        votesByElectionId={{}}
      />,
    );
    const tile = screen.getByRole('button', { name: /Vote blanc/i });
    fireEvent.click(tile);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        election_slug: 'presidentielle-2022-t1',
        choice_kind: 'blanc',
        election_result_id: null,
      }),
    );
  });
});

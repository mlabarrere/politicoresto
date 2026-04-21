import { describe, expect, it } from 'vitest';

import { normalizePostPollSummary } from '@/lib/polls/summary';

describe('normalizePostPollSummary', () => {
  const baseRow = {
    post_item_id: 'item-1',
    post_id: 'post-1',
    post_slug: 'mon-post',
    post_title: 'Mon Post',
    question: "Etes-vous d'accord ?",
    deadline_at: '2026-12-31T00:00:00Z',
    poll_status: 'open',
    sample_size: 100,
    effective_sample_size: 90,
    representativity_score: 0.85,
    coverage_score: 0.9,
    distance_score: 0.7,
    stability_score: 0.8,
    anti_brigading_score: 0.95,
    raw_results: [],
    corrected_results: [],
    options: [],
    selected_option_id: null,
  };

  it('returns null for null input', () => {
    expect(normalizePostPollSummary(null)).toBeNull();
  });

  it('returns null when post_item_id is missing', () => {
    const row = { ...baseRow, post_item_id: '' };
    expect(normalizePostPollSummary(row)).toBeNull();
  });

  it('returns null when question is missing', () => {
    const row = { ...baseRow, question: '' };
    expect(normalizePostPollSummary(row)).toBeNull();
  });

  it('normalizes a valid row', () => {
    const result = normalizePostPollSummary(baseRow);
    expect(result).not.toBeNull();
    expect(result?.post_item_id).toBe('item-1');
    expect(result?.question).toBe("Etes-vous d'accord ?");
    expect(result?.poll_status).toBe('open');
    expect(result?.sample_size).toBe(100);
  });

  it('maps poll_status closed correctly', () => {
    const result = normalizePostPollSummary({
      ...baseRow,
      poll_status: 'closed',
    });
    expect(result?.poll_status).toBe('closed');
  });

  it('defaults unknown poll_status to open', () => {
    const result = normalizePostPollSummary({
      ...baseRow,
      poll_status: 'unknown',
    });
    expect(result?.poll_status).toBe('open');
  });

  it('normalizes options array', () => {
    const row = {
      ...baseRow,
      options: [
        { option_id: 'opt-1', label: 'Oui', sort_order: 0 },
        { option_id: 'opt-2', label: 'Non', sort_order: 1 },
      ],
    };
    const result = normalizePostPollSummary(row);
    expect(result?.options).toHaveLength(2);
    expect(result?.options[0]!.label).toBe('Oui');
  });

  it('filters out invalid options', () => {
    const row = {
      ...baseRow,
      options: [
        { option_id: '', label: 'Invalid' }, // missing option_id
        null, // null entry
        { option_id: 'opt-1', label: 'Valid', sort_order: 0 },
      ],
    };
    const result = normalizePostPollSummary(row);
    expect(result?.options).toHaveLength(1);
    expect(result?.options[0]!.option_id).toBe('opt-1');
  });

  it('normalizes raw_results with share and counts', () => {
    const row = {
      ...baseRow,
      raw_results: [
        {
          option_id: 'opt-1',
          option_label: 'Oui',
          sort_order: 0,
          share: 0.6,
          response_count: 60,
          weighted_count: 58,
        },
      ],
    };
    const result = normalizePostPollSummary(row);
    expect(result?.raw_results).toHaveLength(1);
    expect(result?.raw_results[0]!.share).toBe(0.6);
    expect(result?.raw_results[0]!.response_count).toBe(60);
  });

  it('filters out invalid result points', () => {
    const row = {
      ...baseRow,
      raw_results: [
        { option_id: '', option_label: 'Bad' }, // missing option_id
        { option_id: 'opt-1', option_label: 'Good', sort_order: 0, share: 0.5 },
      ],
    };
    const result = normalizePostPollSummary(row);
    expect(result?.raw_results).toHaveLength(1);
  });

  it('handles selected_option_id string', () => {
    const result = normalizePostPollSummary({
      ...baseRow,
      selected_option_id: 'opt-2',
    });
    expect(result?.selected_option_id).toBe('opt-2');
  });

  it('sets selected_option_id to null for non-string value', () => {
    const result = normalizePostPollSummary({
      ...baseRow,
      selected_option_id: 42,
    });
    expect(result?.selected_option_id).toBeNull();
  });

  it('handles empty arrays gracefully', () => {
    const result = normalizePostPollSummary({
      ...baseRow,
      options: [],
      raw_results: [],
      corrected_results: [],
    });
    expect(result?.options).toHaveLength(0);
    expect(result?.raw_results).toHaveLength(0);
    expect(result?.corrected_results).toHaveLength(0);
  });

  it('handles non-array options field', () => {
    const result = normalizePostPollSummary({
      ...baseRow,
      options: 'not-an-array',
    });
    expect(result?.options).toHaveLength(0);
  });
});

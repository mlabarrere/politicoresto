/**
 * Reference pattern: COMPONENT test.
 *
 * Renders a React component in jsdom via @testing-library/react, then
 * interacts with it as a user would (querying by role / label / text)
 * and asserts on the rendered output — never on internal state or
 * implementation details.
 *
 * Mocking: only at the NETWORK boundary (fetch / Server Action import).
 * Do not mock the component itself or its immediate children.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppBadge } from '@/components/app/app-badge';

describe('<AppBadge /> [reference component example]', () => {
  it('renders the provided label', () => {
    render(<AppBadge label="Online" tone="success" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('defaults to the neutral tone when none is supplied', () => {
    render(<AppBadge label="Idle" />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });
});

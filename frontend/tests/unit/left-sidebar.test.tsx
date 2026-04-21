import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeftSidebar } from '@/components/home/left-sidebar';

describe('leftSidebar', () => {
  it('renders sondages section', () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText('Sondages')).toBeTruthy();
  });

  it('renders En cours and Passé filter buttons', () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText('En cours')).toBeTruthy();
    expect(screen.getByText('Passé')).toBeTruthy();
  });

  it('renders partis section', () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText('Partis')).toBeTruthy();
  });

  it('renders party filter labels', () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText('🔴 LFI')).toBeTruthy();
    expect(screen.getByText('⬛ RN')).toBeTruthy();
  });

  it('calls onFilterChange with sondage filter on click', () => {
    const onChange = vi.fn();
    render(<LeftSidebar activeFilter={null} onFilterChange={onChange} />);
    fireEvent.click(screen.getByText('En cours'));
    expect(onChange).toHaveBeenCalledWith({ type: 'sondage', status: 'open' });
  });

  it('toggles filter off when clicking active filter', () => {
    const onChange = vi.fn();
    render(
      <LeftSidebar
        activeFilter={{ type: 'sondage', status: 'open' }}
        onFilterChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('En cours'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onFilterChange with parti filter on party click', () => {
    const onChange = vi.fn();
    render(<LeftSidebar activeFilter={null} onFilterChange={onChange} />);
    fireEvent.click(screen.getByText('🔴 LFI'));
    expect(onChange).toHaveBeenCalledWith({
      type: 'parti',
      slug: 'lfi',
    });
  });

  it('highlights the active filter button', () => {
    render(
      <LeftSidebar
        activeFilter={{ type: 'sondage', status: 'open' }}
        onFilterChange={vi.fn()}
      />,
    );
    // The active button should have bg-foreground class
    const button = screen.getByText('En cours').closest('button');
    expect(button?.className).toContain('bg-foreground');
  });
});

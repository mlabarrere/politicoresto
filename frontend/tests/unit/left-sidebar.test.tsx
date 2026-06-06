import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeftSidebar } from '@/components/home/left-sidebar';

describe('leftSidebar', () => {
  it('renders partis section', () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText('Partis')).toBeTruthy();
  });

  it('renders party filter labels', () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText('🔴 LFI')).toBeTruthy();
    expect(screen.getByText('⬛ RN')).toBeTruthy();
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

  it('toggles filter off when clicking active filter', () => {
    const onChange = vi.fn();
    render(
      <LeftSidebar
        activeFilter={{ type: 'parti', slug: 'lfi' }}
        onFilterChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('🔴 LFI'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('highlights the active filter button', () => {
    render(
      <LeftSidebar
        activeFilter={{ type: 'parti', slug: 'lfi' }}
        onFilterChange={vi.fn()}
      />,
    );
    const button = screen.getByText('🔴 LFI').closest('button');
    expect(button?.className).toContain('bg-foreground');
  });
});

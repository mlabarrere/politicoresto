import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label')).toBeTruthy();
  });

  it('renders as span by default', () => {
    const { container } = render(<Badge>Test</Badge>);
    const el = container.querySelector('span');
    expect(el).toBeTruthy();
  });

  it('applies default variant class', () => {
    const { container } = render(<Badge>Default</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-primary');
  });

  it('applies secondary variant class', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-secondary');
  });

  it('applies destructive variant class', () => {
    const { container } = render(<Badge variant="destructive">Danger</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-destructive');
  });

  it('applies outline variant class', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('border-border');
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-badge">Test</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('custom-badge');
  });
});

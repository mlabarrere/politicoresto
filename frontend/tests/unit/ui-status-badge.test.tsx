import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/ui/status-badge';

describe('statusBadge', () => {
  it('renders label text', () => {
    render(<StatusBadge label="Ouvert" />);
    expect(screen.getByText('Ouvert')).toBeTruthy();
  });

  it('renders with default tone when no tone provided', () => {
    const { container } = render(<StatusBadge label="Active" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with accent tone', () => {
    const { container } = render(<StatusBadge label="Accent" tone="accent" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with danger tone', () => {
    const { container } = render(
      <StatusBadge label="Supprimé" tone="danger" />,
    );
    expect(screen.getByText('Supprimé')).toBeTruthy();
  });

  it('renders with success tone', () => {
    const { container } = render(<StatusBadge label="Résolu" tone="success" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with warning tone', () => {
    render(<StatusBadge label="Attention" tone="warning" />);
    expect(screen.getByText('Attention')).toBeTruthy();
  });

  it('renders with info tone', () => {
    render(<StatusBadge label="Info" tone="info" />);
    expect(screen.getByText('Info')).toBeTruthy();
  });

  it('renders with muted tone', () => {
    render(<StatusBadge label="Archivé" tone="muted" />);
    expect(screen.getByText('Archivé')).toBeTruthy();
  });
});

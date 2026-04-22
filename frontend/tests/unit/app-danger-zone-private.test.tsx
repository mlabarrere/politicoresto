import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppDangerZone } from '@/components/app/app-danger-zone';
import { AppPrivateNotice } from '@/components/app/app-private-notice';

// AppModal uses CatalystDialog portal — mock it
vi.mock('@/components/catalyst/dialog', () => ({
  CatalystDialog: ({
    children,
    open,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    title: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

describe('appDangerZone', () => {
  const onDeactivate = vi.fn();
  const onDelete = vi.fn();

  it('renders danger zone section', () => {
    render(<AppDangerZone onDeactivate={onDeactivate} onDelete={onDelete} />);
    expect(screen.getByText('Danger Zone')).toBeTruthy();
  });

  it('renders deactivate button', () => {
    render(<AppDangerZone onDeactivate={onDeactivate} onDelete={onDelete} />);
    expect(screen.getByText('Desactiver')).toBeTruthy();
  });

  it('renders delete button', () => {
    render(<AppDangerZone onDeactivate={onDeactivate} onDelete={onDelete} />);
    expect(screen.getByText('Supprimer')).toBeTruthy();
  });

  it("renders 'Actions sensibles' header", () => {
    render(<AppDangerZone onDeactivate={onDeactivate} onDelete={onDelete} />);
    expect(screen.getByText('Actions sensibles')).toBeTruthy();
  });
});

describe('appPrivateNotice', () => {
  it('renders default message', () => {
    render(<AppPrivateNotice />);
    expect(screen.getByText('Visible uniquement par vous')).toBeTruthy();
  });

  it('renders custom message', () => {
    render(<AppPrivateNotice message="Ces données sont privées." />);
    expect(screen.getByText('Ces données sont privées.')).toBeTruthy();
  });

  it('renders Espace prive title', () => {
    render(<AppPrivateNotice />);
    expect(screen.getByText('Espace prive')).toBeTruthy();
  });

  it('renders Donnees privees label', () => {
    render(<AppPrivateNotice />);
    expect(screen.getByText('Donnees privees')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AppPrivateNotice className="custom-notice" />,
    );
    expect(container.innerHTML).toContain('custom-notice');
  });
});

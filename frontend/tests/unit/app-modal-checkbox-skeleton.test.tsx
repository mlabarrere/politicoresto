import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppCheckbox } from '@/components/app/app-checkbox';
import { AppSkeleton } from '@/components/app/app-skeleton';

// AppModal uses CatalystDialog which uses a portal — skip for now, just test basic render
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

import { AppModal } from '@/components/app/app-modal';

describe('AppCheckbox', () => {
  it('renders a checkbox input', () => {
    const { container } = render(<AppCheckbox />);
    const input = container.querySelector("input[type='checkbox']");
    expect(input).toBeTruthy();
  });

  it('accepts checked prop', () => {
    const { container } = render(<AppCheckbox defaultChecked />);
    const input = container.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    expect(input.defaultChecked).toBe(true);
  });

  it('calls onChange handler', () => {
    const handler = vi.fn();
    const { container } = render(<AppCheckbox onChange={handler} />);
    const input = container.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    fireEvent.click(input);
    expect(handler).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(<AppCheckbox className="custom-cls" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('custom-cls');
  });
});

describe('AppSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<AppSkeleton className="h-4 w-32" />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('AppModal', () => {
  it('renders trigger content', () => {
    render(
      <AppModal trigger={<button>Ouvrir</button>} title="Mon modal">
        <p>Contenu</p>
      </AppModal>,
    );
    expect(screen.getByText('Ouvrir')).toBeTruthy();
  });

  it('opens dialog when trigger is clicked', () => {
    render(
      <AppModal trigger={<button>Cliquer</button>} title="Modal test">
        <p>Bonjour</p>
      </AppModal>,
    );
    fireEvent.click(screen.getByText('Cliquer'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Bonjour')).toBeTruthy();
  });

  it('opens dialog with Enter key on trigger span', () => {
    render(
      <AppModal trigger={<span>Clavier</span>} title="Modal clavier">
        <p>Via clavier</p>
      </AppModal>,
    );
    const triggerSpan = screen.getByRole('button');
    fireEvent.keyDown(triggerSpan, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('opens dialog with Space key on trigger span', () => {
    render(
      <AppModal trigger={<span>Espace</span>} title="Modal espace">
        <p>Via espace</p>
      </AppModal>,
    );
    const triggerSpan = screen.getByRole('button');
    fireEvent.keyDown(triggerSpan, { key: ' ' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});

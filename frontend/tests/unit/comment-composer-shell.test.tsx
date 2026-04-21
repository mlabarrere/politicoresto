import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommentComposerShell } from '@/components/forms/comment-composer-shell';

describe('CommentComposerShell', () => {
  const defaultProps = {
    initialValue: '',
    placeholder: 'Votre commentaire...',
    submitLabel: 'Publier',
    submittingLabel: 'Publication...',
    submitErrorLabel: 'Erreur de publication',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    testId: 'composer-test',
  };

  beforeEach(() => {
    defaultProps.onSubmit.mockReset();
    defaultProps.onCancel.mockReset();
  });

  it('renders textarea with placeholder', () => {
    render(<CommentComposerShell {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Votre commentaire...');
    expect(textarea).toBeTruthy();
  });

  it('renders submit and cancel buttons', () => {
    render(<CommentComposerShell {...defaultProps} />);
    expect(screen.getByText('Publier')).toBeTruthy();
    expect(screen.getByText('Annuler')).toBeTruthy();
  });

  it('shows error when submitting empty body', async () => {
    render(<CommentComposerShell {...defaultProps} />);
    fireEvent.click(screen.getByText('Publier'));
    await waitFor(() => {
      expect(screen.getByText('Contenu requis.')).toBeTruthy();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed body when valid', async () => {
    defaultProps.onSubmit.mockResolvedValue(undefined);
    render(<CommentComposerShell {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Votre commentaire...');
    fireEvent.change(textarea, { target: { value: '  Mon commentaire  ' } });
    fireEvent.click(screen.getByText('Publier'));
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith('Mon commentaire');
    });
  });

  it('shows submit error label when onSubmit throws', async () => {
    defaultProps.onSubmit.mockRejectedValue(new Error('server error'));
    render(<CommentComposerShell {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Votre commentaire...');
    fireEvent.change(textarea, { target: { value: 'Mon texte' } });
    fireEvent.click(screen.getByText('Publier'));
    await waitFor(() => {
      expect(screen.getByText('Erreur de publication')).toBeTruthy();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<CommentComposerShell {...defaultProps} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('renders with initial value pre-filled', () => {
    render(
      <CommentComposerShell {...defaultProps} initialValue="Texte initial" />,
    );
    const textarea = screen.getByDisplayValue('Texte initial');
    expect(textarea).toBeTruthy();
  });

  it('uses testId as data-testid', () => {
    const { container } = render(
      <CommentComposerShell {...defaultProps} testId="my-composer" />,
    );
    expect(container.querySelector('[data-testid="my-composer"]')).toBeTruthy();
  });
});

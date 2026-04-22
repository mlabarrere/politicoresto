import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommentActionsMenu } from '@/components/forum/comment-actions-menu';

describe('comment actions menu', () => {
  it('shows owner actions', () => {
    render(
      <CommentActionsMenu
        canEdit
        canDelete
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCopyLink={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions commentaire' }),
    );

    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });

  it('hides owner actions for non-owner', () => {
    render(
      <CommentActionsMenu
        canEdit={false}
        canDelete={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCopyLink={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions commentaire' }),
    );

    expect(screen.queryByText('Modifier')).not.toBeInTheDocument();
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument();
    expect(screen.getByText('Copier le lien')).toBeInTheDocument();
  });
});

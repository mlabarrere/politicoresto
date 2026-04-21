import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppEmptyState } from '@/components/app/app-empty-state';
import { AppPageHeader } from '@/components/app/app-page-header';

describe('appEmptyState', () => {
  it('renders title and body', () => {
    render(
      <AppEmptyState
        title="Aucun résultat"
        body="Il n'y a rien ici pour le moment."
      />,
    );
    expect(screen.getByText('Aucun résultat')).toBeTruthy();
    expect(screen.getByText("Il n'y a rien ici pour le moment.")).toBeTruthy();
  });

  it('renders action button when href and label are provided', () => {
    render(
      <AppEmptyState
        title="Vide"
        body="Commencez par créer un post."
        actionHref="/post/new"
        actionLabel="Nouveau post"
      />,
    );
    expect(screen.getByText('Nouveau post')).toBeTruthy();
  });

  it('does not render action button when no href', () => {
    render(<AppEmptyState title="Vide" body="Corps" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('appPageHeader', () => {
  it('renders required title', () => {
    render(<AppPageHeader title="Mon Profil" />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByText('Mon Profil')).toBeTruthy();
  });

  it('renders eyebrow when provided', () => {
    render(<AppPageHeader title="Titre" eyebrow="Section" />);
    expect(screen.getByText('Section')).toBeTruthy();
  });

  it('does not render eyebrow when absent', () => {
    render(<AppPageHeader title="Titre" />);
    expect(screen.queryByText('Section')).toBeNull();
  });

  it('renders description when provided', () => {
    render(<AppPageHeader title="Titre" description="Description du profil" />);
    expect(screen.getByText('Description du profil')).toBeTruthy();
  });

  it('renders actions slot', () => {
    render(<AppPageHeader title="Titre" actions={<button>Modifier</button>} />);
    expect(screen.getByText('Modifier')).toBeTruthy();
  });
});

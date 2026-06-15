import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoussoleQuiz } from '@/components/boussole/boussole-quiz';

// Mock at the server-action boundary (don't pull next/cache + supabase server
// into the jsdom module graph).
const saveMock = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true }));
vi.mock('@/lib/actions/boussole', () => ({
  saveBoussoleResultAction: saveMock,
}));

const theses = [{ ordering: 1, statement: 'Thèse 1' }];
const parties = [
  { party_slug: 'a', party_name: 'Parti A', stances: { 1: 'agree' as const } },
  {
    party_slug: 'b',
    party_name: 'Parti B',
    stances: { 1: 'disagree' as const },
  },
];

describe('boussole quiz', () => {
  it('calcule et affiche le parti le plus proche après une réponse', () => {
    render(
      <BoussoleQuiz
        theses={theses}
        parties={parties}
        axisWeights={{ 1: -1 }}
        economicWeights={{ 1: -1 }}
        culturalWeights={{ 1: 0 }}
        isAuthenticated={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^D.accord/ }));
    fireEvent.click(screen.getByRole('button', { name: /Voir mon résultat/ }));

    expect(screen.getByText(/Le plus proche : Parti A/)).toBeTruthy();
    // Anonyme : pas de bouton d'enregistrement, juste l'invitation à se connecter.
    expect(
      screen.queryByRole('button', { name: /Enregistrer ma position/ }),
    ).toBeNull();
    expect(screen.getByText(/Connecte-toi pour suivre/)).toBeTruthy();
  });

  it('connecté : enregistre la position via le server action', async () => {
    render(
      <BoussoleQuiz
        theses={theses}
        parties={parties}
        axisWeights={{ 1: -1 }}
        economicWeights={{ 1: -1 }}
        culturalWeights={{ 1: 0 }}
        isAuthenticated
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^D.accord/ }));
    fireEvent.click(screen.getByRole('button', { name: /Voir mon résultat/ }));

    const saveBtn = screen.getByRole('button', {
      name: /Enregistrer ma position/,
    });
    fireEvent.click(saveBtn);

    await screen.findByText(/Position enregistrée/);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ leftRight: -1, topPartySlug: 'a' }),
    );
  });
});

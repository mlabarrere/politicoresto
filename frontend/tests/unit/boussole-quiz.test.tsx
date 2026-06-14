import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BoussoleQuiz } from '@/components/boussole/boussole-quiz';

describe('boussole quiz', () => {
  it('calcule et affiche le parti le plus proche après une réponse', () => {
    render(
      <BoussoleQuiz
        theses={[{ ordering: 1, statement: 'Thèse 1' }]}
        parties={[
          { party_slug: 'a', party_name: 'Parti A', stances: { 1: 'agree' } },
          {
            party_slug: 'b',
            party_name: 'Parti B',
            stances: { 1: 'disagree' },
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^D.accord/ }));
    fireEvent.click(screen.getByRole('button', { name: /Voir mon résultat/ }));

    expect(screen.getByText(/Le plus proche : Parti A/)).toBeTruthy();
  });
});

import { expect, test } from '@playwright/test';

/**
 * E2E — page publique d'un Nœud du graphe politique (`/n/[slug]`).
 *
 * Données : les Nœuds sont amorcés depuis `political_entity` (migration
 * 20260614120000) ; `ps` = Parti socialiste, type 'party', verification 'verified'.
 * Page publique → pas d'authentification requise (happy path).
 */
test.describe('Page nœud (graphe politique)', () => {
  test('fiche d’un parti : titre, badge vérifié et JSON-LD schema.org', async ({
    page,
  }) => {
    await page.goto('/n/ps');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Parti socialiste' }),
    ).toBeVisible();
    await expect(page.getByText('Vérifié', { exact: true })).toBeVisible();

    // Découvrabilité : un bloc JSON-LD typé est présent et bien formé.
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const raw = (await jsonLd.textContent()) ?? '';
    const data = JSON.parse(raw) as { '@type': string; name: string };
    expect(data['@type']).toBe('Organization');
    expect(data.name).toBe('Parti socialiste');
  });

  test('nœud inexistant → 404', async ({ page }) => {
    const response = await page.goto('/n/ce-noeud-nexiste-pas-zzz');
    expect(response?.status()).toBe(404);
  });
});

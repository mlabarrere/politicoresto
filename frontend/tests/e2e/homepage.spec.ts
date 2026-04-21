import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test('mvp public smoke', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'PoliticoResto' })).toBeVisible();
  await expect(
    page.getByText('Forum public minimal', { exact: true }).first(),
  ).toBeVisible();

  await page.goto('/');
  const postLinks = page.locator('a[href^="/post/"]');
  const postCount = await postLinks.count();
  if (postCount > 0) {
    const postLink = postLinks.first();
    const postHref = await postLink.getAttribute('href');
    await postLink.click();
    await expect(page).toHaveURL(/\/post\//);
    await expect(page.getByText("Le post n'a pas pu etre charge")).toHaveCount(
      0,
    );
    await expect(
      page.getByText(
        'La page publique du post reste momentanement indisponible',
      ),
    ).toHaveCount(0);

    if (postHref) {
      await page.goto(postHref);
      await expect(page).toHaveURL(/\/post\//);
      await expect(
        page.getByText("Le post n'a pas pu etre charge"),
      ).toHaveCount(0);
      await page.reload();
      await expect(
        page.getByText("Le post n'a pas pu etre charge"),
      ).toHaveCount(0);
    }
  }

  await page.screenshot({
    path: testInfo.outputPath('mvp-smoke.png'),
    fullPage: true,
  });
});

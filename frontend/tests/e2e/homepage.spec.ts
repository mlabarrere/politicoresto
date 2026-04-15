import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("mvp public smoke", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Politicoresto" })).toBeVisible();
  await expect(page.getByText("Forum politique", { exact: true }).first()).toBeVisible();

  await page.goto("/category/gauche-radicale");
  await expect(page.getByText("Categorie:")).toBeVisible();

  await page.goto("/auth/login");
  await expect(page.getByText("Se connecter", { exact: true })).toBeVisible();

  await page.goto("/me");
  await expect(page).toHaveURL(/\/auth\/login|\/me/);

  await page.goto("/");
  const postCards = page.locator('article[role="link"]');
  const postCount = await postCards.count();
  if (postCount > 0) {
    await postCards.first().click();
    await expect(page).toHaveURL(/\/post\//);
  }

  await page.screenshot({
    path: testInfo.outputPath("mvp-smoke.png"),
    fullPage: true
  });
});


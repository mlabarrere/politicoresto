import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("mvp public smoke", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Politicoresto" })).toBeVisible();
  await expect(page.getByText("Categories", { exact: true })).toBeVisible();

  await page.goto("/category/gauche-radicale");
  await expect(page.getByText("Categorie:")).toBeVisible();

  await page.goto("/auth/login");
  await expect(page.getByText("Se connecter", { exact: true })).toBeVisible();

  await page.goto("/me");
  await expect(page).toHaveURL(/\/auth\/login|\/me/);

  await page.goto("/");
  const threadLinks = page.locator('a[href^="/thread/"]');
  const threadCount = await threadLinks.count();
  if (threadCount > 0) {
    await threadLinks.first().click();
    await expect(page).toHaveURL(/\/thread\//);
  }

  await page.screenshot({
    path: testInfo.outputPath("mvp-smoke.png"),
    fullPage: true
  });
});

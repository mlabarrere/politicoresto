import { expect, test } from "@playwright/test";

test("homepage renders on desktop and exposes the feed", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Feed presidentiel"
    })
  ).toBeVisible();

  await expect(page.getByText("Blocs")).toBeVisible();
  await expect(page.getByText("Analystes")).toBeVisible();
  await expect(page.getByText("Vault prive")).toBeVisible();

  const cards = page.locator("article");
  const cardCount = await cards.count();

  if (cardCount > 0) {
    await expect(cards.first()).toBeVisible();

    const firstThreadLink = cards.first().getByRole("link").first();
    await firstThreadLink.click();
    await expect(page).toHaveURL(/\/thread\//);
  } else {
    const emptyVisible = await page.getByText("Aucun thread visible").count();
    const unavailableVisible = await page.getByText("Feed partiel").count();

    expect(emptyVisible + unavailableVisible).toBeGreaterThan(0);
  }

  await page.screenshot({
    path: testInfo.outputPath("homepage-desktop.png"),
    fullPage: true
  });
});

test("homepage stays readable on mobile", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Feed presidentiel"
    })
  ).toBeVisible();

  const cards = page.locator("article");
  await expect(page.getByText("Vault prive")).toBeVisible();

  const cardCount = await cards.count();

  if (cardCount > 0) {
    await expect(cards.first()).toBeVisible();
  } else {
    const emptyVisible = await page.getByText("Aucun thread visible").count();
    const unavailableVisible = await page.getByText("Feed partiel").count();

    expect(emptyVisible + unavailableVisible).toBeGreaterThan(0);
  }

  await page.screenshot({
    path: testInfo.outputPath("homepage-mobile.png"),
    fullPage: true
  });
});

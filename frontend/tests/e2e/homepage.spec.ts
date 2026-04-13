import { expect, test } from "@playwright/test";

test("homepage renders on desktop and exposes the editorial feed", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Suivez les sujets publics qui comptent."
    })
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "A surveiller" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cartes a debloquer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pres de vous" })).toBeVisible();

  const cards = page.locator("article").filter({ hasText: "Question" });
  const cardCount = await cards.count();

  if (cardCount > 0) {
    await expect(cards.first()).toBeVisible();

    const firstTopicLink = cards.first().getByRole("link").first();
    await firstTopicLink.click();
    await expect(page).toHaveURL(/\/topic\//);
  } else {
    const emptyVisible = await page.getByText("Les sujets arrivent").count();
    const unavailableVisible = await page.getByText("Le flux principal est partiellement disponible").count();

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
      name: "Suivez les sujets publics qui comptent."
    })
  ).toBeVisible();

  const cards = page.locator("article").filter({ hasText: "Question" });
  await expect(page.getByRole("heading", { name: "A surveiller" })).toBeVisible();

  const cardCount = await cards.count();

  if (cardCount > 0) {
    await expect(cards.first()).toBeVisible();
  } else {
    const emptyVisible = await page.getByText("Les sujets arrivent").count();
    const unavailableVisible = await page.getByText("Le flux principal est partiellement disponible").count();

    expect(emptyVisible + unavailableVisible).toBeGreaterThan(0);
  }

  await page.screenshot({
    path: testInfo.outputPath("homepage-mobile.png"),
    fullPage: true
  });
});
